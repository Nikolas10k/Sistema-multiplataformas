import { Prisma, type Condominio } from "@prisma/client";
import { db } from "./db";
import { situacaoAcesso } from "./condominio";
import { equipesDoPlantao, recepcionistasEm } from "./escala";
import { enviarParaVarios, telefonesDoSetor } from "./notificacoes";
import { situacaoRondas } from "./operacao";
import {
  formatarData,
  formatarHora,
  instanteLocal,
  partesLocais,
  plantaoEm,
  plantaoSeguinte,
  relogioDe,
  somarMinutos,
  ultimoDiaEncerrado,
  type Plantao,
} from "./tempo";
import { gerarLivroDiario, gerarPassagemTurno } from "./agente/relatorios";
import { aplicarSuspensoes, sincronizarFaturas } from "./cobranca/assinatura";
import { asaasConfigurado } from "./cobranca/asaas";

const MINUTOS_ANTES_DA_TROCA = 15;
const MINUTOS_APOS_TROCA_LIVRO = 10;

/** Marca a tarefa como feita; devolve false se outra execução já a fez. */
async function reivindicar(chave: string): Promise<boolean> {
  try {
    await db.tarefaAgendadaExecucao.create({ data: { chave } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

async function liberar(chave: string) {
  await db.tarefaAgendadaExecucao.delete({ where: { chave } }).catch(() => undefined);
}

/** Executa uma tarefa uma única vez por chave; se falhar, libera para tentar no próximo ciclo. */
async function umaVez(chave: string, tarefa: () => Promise<unknown>) {
  if (!(await reivindicar(chave))) return;
  try {
    await tarefa();
  } catch (e) {
    await liberar(chave);
    throw e;
  }
}

async function telefonesEncarregados(c: Condominio, p: Plantao): Promise<string[]> {
  const equipes = await equipesDoPlantao(c.id, p);
  const tels = equipes.flatMap((e) => e.membros.filter((m) => m.papel === "ENCARREGADO" && m.telefone).map((m) => m.telefone!));
  return tels.length ? tels : telefonesDoSetor(c.id, "PORTARIA");
}

async function passagemDeTurno(c: Condominio, agora: Date) {
  const r = relogioDe(c);
  const p = plantaoEm(r, agora);
  if (p.fim.getTime() - agora.getTime() > MINUTOS_ANTES_DA_TROCA * 60_000) return;
  await umaVez(`${c.id}:passagem:${p.chave}`, async () => {
    const passagem = await gerarPassagemTurno(c, p);
    const destinos = [...(await telefonesEncarregados(c, plantaoSeguinte(r, p))), ...(await telefonesDoSetor(c.id, "SUPERVISOR"))];
    await enviarParaVarios(c, destinos, `📋 *Passagem de turno* (${formatarHora(r, p.fim)})\n\n${passagem.resumo}`);
  });
}

async function livroDoDia(c: Condominio, agora: Date) {
  const r = relogioDe(c);
  const hoje = partesLocais(r, agora).dataISO;
  if (agora < instanteLocal(r, hoje, somarMinutos(r.inicioDia, MINUTOS_APOS_TROCA_LIVRO))) return;
  const data = ultimoDiaEncerrado(r, agora);
  await umaVez(`${c.id}:livro:${data}`, async () => {
    await gerarLivroDiario(c, data);
    await enviarParaVarios(
      c,
      await telefonesDoSetor(c.id, "SUPERVISOR"),
      `📖 O livro de ocorrências de ${formatarData(data)} foi gerado e está aguardando conferência no sistema.`,
    );
  });
}

async function rondasAtrasadas(c: Condominio, agora: Date) {
  const r = relogioDe(c);
  const p = plantaoEm(r, agora);
  const atrasadas = (await situacaoRondas(c.id, r, p, agora)).filter((s) => s.situacao === "ATRASADA");
  const novas = [];
  for (const s of atrasadas) {
    // Um alerta por local a cada ronda que falta (a chave muda quando uma ronda nova é feita).
    if (await reivindicar(`${c.id}:ronda:${p.chave}:${s.local.id}:${s.ultima?.getTime() ?? "nenhuma"}`)) novas.push(s);
  }
  if (!novas.length) return;
  const linhas = novas.map((s) => `- ${s.local.nome}: ${s.ultima ? `última às ${formatarHora(r, s.ultima)}` : "nenhuma ronda no plantão"}`);
  await enviarParaVarios(c, await telefonesEncarregados(c, p), `⏰ *Rondas atrasadas*\n${linhas.join("\n")}`);
}

async function apoiosAguardando(c: Condominio, agora: Date) {
  const r = relogioDe(c);
  const pendentes = await db.atendimentoAcessibilidade.findMany({ where: { condominioId: c.id, status: "SOLICITADO" } });
  for (const a of pendentes) {
    if (!(await reivindicar(`${c.id}:apoio:${a.id}`))) continue;
    const recepcao = (await recepcionistasEm(c.id, r, agora)).flatMap((u) => (u.telefone ? [u.telefone] : []));
    const destinos = [...recepcao, ...(await telefonesEncarregados(c, plantaoEm(r, agora)))];
    await enviarParaVarios(
      c,
      destinos,
      `♿ *Apoio de acessibilidade solicitado*\n${a.pessoa} (${a.necessidade.toLowerCase().replace(/_/g, " ")})${a.destino ? ` → ${a.destino}` : ""}${a.observacao ? `\n${a.observacao}` : ""}\nResponda aqui quando assumir o atendimento.`,
    );
  }
}

/** Rotina diária da plataforma: suspensões e conferência das faturas com o Asaas. */
async function rotinaDaPlataforma(agora: Date) {
  const dia = agora.toISOString().slice(0, 10);
  await umaVez(`plataforma:suspensoes:${dia}:${agora.getUTCHours()}`, () => aplicarSuspensoes(agora));
  if (!asaasConfigurado()) return;
  await umaVez(`plataforma:faturas:${dia}`, async () => {
    const assinantes = await db.condominio.findMany({ where: { asaasSubscriptionId: { not: null }, status: { not: "CANCELADO" } } });
    for (const c of assinantes) await sincronizarFaturas(c).catch((e) => console.error("[asaas] sincronização", c.id, e));
  });
}

const TAREFAS = [apoiosAguardando, rondasAtrasadas, passagemDeTurno, livroDoDia];
let rodando = false;

async function ciclo() {
  if (rodando) return;
  rodando = true;
  const agora = new Date();
  try {
    await rotinaDaPlataforma(agora).catch((e) => console.error("[agendador] rotina da plataforma falhou", e));
    const condominios = await db.condominio.findMany({ where: { status: { in: ["TESTE", "ATIVO", "INADIMPLENTE"] } } });
    for (const c of condominios) {
      if (!situacaoAcesso(c, agora).liberado) continue;
      for (const tarefa of TAREFAS) {
        await tarefa(c, agora).catch((e) => console.error(`[agendador] ${c.slug}: ${tarefa.name} falhou`, e));
      }
    }
  } finally {
    rodando = false;
  }
}

export function iniciarAgendador() {
  const g = globalThis as unknown as { __agendador?: NodeJS.Timeout };
  if (g.__agendador) return;
  console.log("[agendador] iniciado");
  g.__agendador = setInterval(ciclo, 60_000);
  setTimeout(ciclo, 10_000);
}

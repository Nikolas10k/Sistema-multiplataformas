import { Prisma } from "@prisma/client";
import { db } from "./db";
import { equipesDoPlantao, recepcionistasEm } from "./escala";
import { telefonesDoSetor } from "./notificacoes";
import { situacaoRondas } from "./operacao";
import { formatarData, formatarHora, instanteSP, partesSP, plantaoEm, plantaoSeguinte, somarDias, type Plantao } from "./tempo";
import { enviarTexto } from "./whatsapp";
import { gerarLivroDiario, gerarPassagemTurno } from "./agente/relatorios";

const MINUTOS_ANTES_DA_TROCA = 15;
const HORA_LIVRO = "07:10";

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

async function telefonesEncarregados(p: Plantao): Promise<string[]> {
  const equipes = await equipesDoPlantao(p);
  const tels = equipes.flatMap((e) => e.membros.filter((m) => m.papel === "ENCARREGADO" && m.telefone).map((m) => m.telefone!));
  return tels.length ? tels : telefonesDoSetor("PORTARIA");
}

async function enviarPara(telefones: Iterable<string>, texto: string) {
  await Promise.all([...new Set(telefones)].map((t) => enviarTexto(t, texto)));
}

async function passagemDeTurno(agora: Date) {
  const p = plantaoEm(agora);
  if (p.fim.getTime() - agora.getTime() > MINUTOS_ANTES_DA_TROCA * 60_000) return;
  const chave = `passagem:${p.chave}`;
  if (!(await reivindicar(chave))) return;
  try {
    const passagem = await gerarPassagemTurno(p);
    const seguinte = plantaoSeguinte(p);
    const destinos = [...(await telefonesEncarregados(seguinte)), ...(await telefonesDoSetor("SUPERVISOR"))];
    await enviarPara(destinos, `📋 *Passagem de turno* (${formatarHora(p.fim)})\n\n${passagem.resumo}`);
  } catch (e) {
    await liberar(chave);
    throw e;
  }
}

async function livroDoDia(agora: Date) {
  const hoje = partesSP(agora).dataISO;
  if (agora < instanteSP(hoje, HORA_LIVRO)) return;
  const data = somarDias(hoje, -1);
  const chave = `livro:${data}`;
  if (!(await reivindicar(chave))) return;
  try {
    await gerarLivroDiario(data);
    await enviarPara(
      await telefonesDoSetor("SUPERVISOR"),
      `📖 O livro de ocorrências de ${formatarData(data)} foi gerado e está aguardando conferência no sistema.`,
    );
  } catch (e) {
    await liberar(chave);
    throw e;
  }
}

async function rondasAtrasadas(agora: Date) {
  const p = plantaoEm(agora);
  const atrasadas = (await situacaoRondas(p, agora)).filter((s) => s.situacao === "ATRASADA");
  const novas = [];
  for (const s of atrasadas) {
    // Um alerta por local a cada ronda que falta (a chave muda quando uma ronda nova é feita).
    const chave = `ronda:${p.chave}:${s.local.id}:${s.ultima?.getTime() ?? "nenhuma"}`;
    if (await reivindicar(chave)) novas.push(s);
  }
  if (!novas.length) return;
  const linhas = novas.map((s) => `- ${s.local.nome}: ${s.ultima ? `última às ${formatarHora(s.ultima)}` : "nenhuma ronda no plantão"}`);
  await enviarPara(await telefonesEncarregados(p), `⏰ *Rondas atrasadas*\n${linhas.join("\n")}`);
}

async function apoiosAguardando(agora: Date) {
  const pendentes = await db.atendimentoAcessibilidade.findMany({ where: { status: "SOLICITADO" } });
  for (const a of pendentes) {
    if (!(await reivindicar(`apoio:${a.id}`))) continue;
    const recepcao = (await recepcionistasEm(agora)).flatMap((r) => (r.telefone ? [r.telefone] : []));
    const destinos = [...recepcao, ...(await telefonesEncarregados(plantaoEm(agora)))];
    await enviarPara(
      destinos,
      `♿ *Apoio de acessibilidade solicitado*\n${a.pessoa} (${a.necessidade.toLowerCase().replace(/_/g, " ")})${a.destino ? ` → ${a.destino}` : ""}${a.observacao ? `\n${a.observacao}` : ""}\nResponda aqui quando assumir o atendimento.`,
    );
  }
}

let rodando = false;

async function ciclo() {
  if (rodando) return;
  rodando = true;
  const agora = new Date();
  try {
    for (const tarefa of [apoiosAguardando, rondasAtrasadas, passagemDeTurno, livroDoDia]) {
      await tarefa(agora).catch((e) => console.error(`[agendador] ${tarefa.name} falhou`, e));
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

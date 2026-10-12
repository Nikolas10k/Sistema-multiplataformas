import type { Condominio, Usuario } from "@prisma/client";
import { db } from "../db";
import { dadosDoPeriodo } from "../operacao";
import { equipesDoPlantao } from "../escala";
import { NOME_SETOR } from "../permissoes";
import {
  dataParaBanco,
  diaOperacional,
  formatarData,
  formatarDataHora,
  formatarHora,
  nomeTurno,
  relogioDe,
  type Plantao,
  type Relogio,
} from "../tempo";
import { consumoDe, criarMensagem } from "./cliente";
import { registrarUso } from "./uso";

type Dados = Awaited<ReturnType<typeof dadosDoPeriodo>>;

/** Converte os registros num texto compacto para o Claude redigir o resumo. */
function serializar(r: Relogio, d: Dados): string {
  const h = (x: Date) => formatarHora(r, x);
  const linhas: string[] = [];
  linhas.push(`## Rondas (${d.rondas.length})`);
  for (const x of d.rondas)
    linhas.push(`- ${h(x.realizadaEm)} ${x.local.nome} · ${x.porteiro.nome}${x.comAlteracao ? " · COM ALTERAÇÃO" : ""}${x.observacao ? ` · ${x.observacao}` : ""}`);

  linhas.push(`\n## Ocorrências registradas no período (${d.ocorrenciasCriadas.length})`);
  for (const o of d.ocorrenciasCriadas)
    linhas.push(
      `- #${o.numero} ${h(o.criadaEm)} [${o.prioridade}] [${o.categoria}] → ${NOME_SETOR[o.setor]} · ${o.titulo}${o.local ? ` · ${o.local.nome}` : ""}${o.sala ? ` · sala ${o.sala}` : ""} · status ${o.status} · por ${o.registradoPor.nome}\n  ${o.descricao.replace(/\n/g, " ")}${o.resolucao ? `\n  Resolução: ${o.resolucao}` : ""}`,
    );

  linhas.push(`\n## Ocorrências resolvidas no período (${d.ocorrenciasResolvidas.length})`);
  for (const o of d.ocorrenciasResolvidas)
    linhas.push(`- #${o.numero} ${o.titulo} · ${o.resolucao ?? ""} · por ${o.resolvidaPor?.nome ?? "?"}`);

  linhas.push(`\n## Ocorrências ainda abertas no prédio (${d.abertas.length})`);
  for (const o of d.abertas)
    linhas.push(`- #${o.numero} [${o.prioridade}] ${o.titulo} → ${NOME_SETOR[o.setor]} · aberta em ${formatarDataHora(r, o.criadaEm)} · ${o.status}`);

  const noPredio = d.acessos.filter((a) => !a.saidaEm);
  const semCadastro = d.acessos.filter((a) => !a.cadastradoInvenzi);
  linhas.push(
    `\n## Controle de acesso: ${d.acessos.length} entradas, ${noPredio.length} sem saída registrada, ${semCadastro.length} sem confirmação no sistema de acesso`,
  );
  for (const a of d.acessos.slice(0, 80))
    linhas.push(`- ${h(a.entradaEm)} ${a.nome} (${a.tipo})${a.sala ? ` sala ${a.sala}` : ""}${a.empresa ? ` · ${a.empresa}` : ""}${a.saidaEm ? ` · saiu ${h(a.saidaEm)}` : " · sem saída"}${a.cadastradoInvenzi ? "" : " · NÃO cadastrado no sistema de acesso"}`);

  linhas.push(`\n## Apoio a PcD / idosos (${d.apoios.length})`);
  for (const a of d.apoios)
    linhas.push(`- ${h(a.criadoEm)} ${a.pessoa} (${a.necessidade})${a.destino ? ` → ${a.destino}` : ""} · ${a.status}${a.atendidoPor ? ` · ${a.atendidoPor.nome}` : ""}`);

  return linhas.join("\n");
}

async function redigir(condominio: Condominio, instrucao: string, dados: string): Promise<string> {
  const resposta = await criarMensagem({
    system: `Você redige registros operacionais do condomínio ${condominio.nome}, em português do Brasil, de forma objetiva e fiel aos dados. Nunca invente fatos que não estejam nos dados. Se uma seção não tiver registros, diga isso em uma linha.`,
    messages: [{ role: "user", content: `${instrucao}\n\n<dados>\n${dados}\n</dados>` }],
  });
  await registrarUso(condominio, consumoDe(resposta.usage), 0).catch(() => undefined);
  if (resposta.stop_reason === "refusal") throw new Error("O modelo recusou gerar o relatório.");
  return resposta.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
}

/** Passagem de turno: o que o próximo plantão precisa saber. Salva e devolve o registro. */
export async function gerarPassagemTurno(condominio: Condominio, p: Plantao, autor?: Usuario | null) {
  const r = relogioDe(condominio);
  const [dados, equipes] = await Promise.all([
    dadosDoPeriodo(condominio.id, p.inicio, p.fim),
    equipesDoPlantao(condominio.id, p),
  ]);
  const cabecalho = `Plantão ${nomeTurno(r, p.turno)} de ${formatarData(p.data)}. Equipe(s): ${equipes.map((e) => e.nome).join(", ") || "não identificada"}.`;
  const texto = await redigir(
    condominio,
    `${cabecalho}\nEscreva a passagem de turno para a equipe que vai assumir. Comece pelo que exige ação (pendências, ocorrências abertas de prioridade alta ou urgente, pessoas sem saída registrada, cadastros faltando no sistema de acesso, apoios em andamento). Depois, um resumo curto do que aconteceu. Formato para WhatsApp: frases curtas, listas com "-", *negrito* só nos alertas, sem tabelas e sem títulos com #. No máximo 25 linhas.`,
    serializar(r, dados),
  );
  return db.passagemTurno.create({
    data: { condominioId: condominio.id, data: dataParaBanco(p.data), turno: p.turno, resumo: texto, autorId: autor?.id },
  });
}

/** Livro de ocorrências digital do dia operacional. */
export async function gerarLivroDiario(condominio: Condominio, dataISO: string) {
  const r = relogioDe(condominio);
  const { inicio, fim } = diaOperacional(r, dataISO);
  const dados = await dadosDoPeriodo(condominio.id, inicio, fim);
  const texto = await redigir(
    condominio,
    `Escreva o livro de ocorrências do condomínio referente ao dia operacional ${formatarData(dataISO)} (das ${r.inicioDia} desse dia às ${r.inicioDia} do dia seguinte). Ele substitui o livro escrito à mão pelo encarregado e será conferido e assinado.
Estrutura, em Markdown simples:
1. "Resumo do dia" (3 a 5 linhas).
2. "Rondas": por turno (dia e noite), quantas e quais locais, destacando as com alteração.
3. "Ocorrências": cada uma em ordem de horário, com número, horário, local, descrição, setor e situação.
4. "Controle de acesso": totais e pendências (sem saída, sem cadastro no sistema de acesso).
5. "Acessibilidade": atendimentos feitos.
6. "Pendências para o próximo dia".
Use os horários dos dados. Linguagem formal e objetiva.`,
    serializar(r, dados),
  );
  const chave = { condominioId_data: { condominioId: condominio.id, data: dataParaBanco(dataISO) } };
  return db.livroDiario.upsert({
    where: chave,
    create: { condominioId: condominio.id, data: dataParaBanco(dataISO), conteudo: texto },
    update: { conteudo: texto, geradoEm: new Date(), conferidoPor: null, conferidoEm: null },
  });
}

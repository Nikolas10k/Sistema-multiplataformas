import type { Usuario } from "@prisma/client";
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
  type Plantao,
} from "../tempo";
import { criarMensagem } from "./cliente";

type Dados = Awaited<ReturnType<typeof dadosDoPeriodo>>;

/** Converte os registros num texto compacto para o Claude redigir o resumo. */
function serializar(d: Dados): string {
  const linhas: string[] = [];
  linhas.push(`## Rondas (${d.rondas.length})`);
  for (const r of d.rondas)
    linhas.push(`- ${formatarHora(r.realizadaEm)} ${r.local.nome} · ${r.porteiro.nome}${r.comAlteracao ? " · COM ALTERAÇÃO" : ""}${r.observacao ? ` · ${r.observacao}` : ""}`);

  linhas.push(`\n## Ocorrências registradas no período (${d.ocorrenciasCriadas.length})`);
  for (const o of d.ocorrenciasCriadas)
    linhas.push(
      `- #${o.id} ${formatarHora(o.criadaEm)} [${o.prioridade}] [${o.categoria}] → ${NOME_SETOR[o.setor]} · ${o.titulo}${o.local ? ` · ${o.local.nome}` : ""}${o.sala ? ` · sala ${o.sala}` : ""} · status ${o.status} · por ${o.registradoPor.nome}\n  ${o.descricao.replace(/\n/g, " ")}${o.resolucao ? `\n  Resolução: ${o.resolucao}` : ""}`,
    );

  linhas.push(`\n## Ocorrências resolvidas no período (${d.ocorrenciasResolvidas.length})`);
  for (const o of d.ocorrenciasResolvidas)
    linhas.push(`- #${o.id} ${o.titulo} · ${o.resolucao ?? ""} · por ${o.resolvidaPor?.nome ?? "?"}`);

  linhas.push(`\n## Ocorrências ainda abertas no prédio (${d.abertas.length})`);
  for (const o of d.abertas)
    linhas.push(`- #${o.id} [${o.prioridade}] ${o.titulo} → ${NOME_SETOR[o.setor]} · aberta em ${formatarDataHora(o.criadaEm)} · ${o.status}`);

  const noPredio = d.acessos.filter((a) => !a.saidaEm);
  const semInvenzi = d.acessos.filter((a) => !a.cadastradoInvenzi);
  linhas.push(
    `\n## Controle de acesso: ${d.acessos.length} entradas, ${noPredio.length} sem saída registrada, ${semInvenzi.length} sem confirmação no Invenzi`,
  );
  for (const a of d.acessos.slice(0, 80))
    linhas.push(`- ${formatarHora(a.entradaEm)} ${a.nome} (${a.tipo})${a.sala ? ` sala ${a.sala}` : ""}${a.empresa ? ` · ${a.empresa}` : ""}${a.saidaEm ? ` · saiu ${formatarHora(a.saidaEm)}` : " · sem saída"}${a.cadastradoInvenzi ? "" : " · NÃO cadastrado no Invenzi"}`);

  linhas.push(`\n## Apoio a PcD / idosos (${d.apoios.length})`);
  for (const a of d.apoios)
    linhas.push(`- ${formatarHora(a.criadoEm)} ${a.pessoa} (${a.necessidade})${a.destino ? ` → ${a.destino}` : ""} · ${a.status}${a.atendidoPor ? ` · ${a.atendidoPor.nome}` : ""}`);

  return linhas.join("\n");
}

async function redigir(instrucao: string, dados: string): Promise<string> {
  const resposta = await criarMensagem({
    system:
      "Você redige registros operacionais de um condomínio comercial, em português do Brasil, de forma objetiva e fiel aos dados. Nunca invente fatos que não estejam nos dados. Se uma seção não tiver registros, diga isso em uma linha.",
    messages: [{ role: "user", content: `${instrucao}\n\n<dados>\n${dados}\n</dados>` }],
  });
  if (resposta.stop_reason === "refusal") throw new Error("O modelo recusou gerar o relatório.");
  return resposta.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
}

/** Passagem de turno: o que o próximo plantão precisa saber. Salva e devolve o texto. */
export async function gerarPassagemTurno(p: Plantao, autor?: Usuario | null) {
  const [dados, equipes] = await Promise.all([dadosDoPeriodo(p.inicio, p.fim), equipesDoPlantao(p)]);
  const cabecalho = `Plantão ${nomeTurno(p.turno)} de ${formatarData(p.data)}. Equipe(s): ${equipes.map((e) => e.nome).join(", ") || "não identificada"}.`;
  const texto = await redigir(
    `${cabecalho}\nEscreva a passagem de turno para a equipe que vai assumir. Comece pelo que exige ação (pendências, ocorrências abertas de prioridade alta ou urgente, pessoas sem saída registrada, cadastros faltando no Invenzi, apoios em andamento). Depois, um resumo curto do que aconteceu. Formato para WhatsApp: frases curtas, listas com "-", *negrito* só nos alertas, sem tabelas e sem títulos com #. No máximo 25 linhas.`,
    serializar(dados),
  );
  const passagem = await db.passagemTurno.create({
    data: { data: dataParaBanco(p.data), turno: p.turno, resumo: texto, autorId: autor?.id },
  });
  return passagem;
}

/** Livro de ocorrências digital do dia operacional (07h às 07h). */
export async function gerarLivroDiario(dataISO: string) {
  const { inicio, fim } = diaOperacional(dataISO);
  const dados = await dadosDoPeriodo(inicio, fim);
  const texto = await redigir(
    `Escreva o livro de ocorrências do condomínio referente ao dia operacional ${formatarData(dataISO)} (das 07h desse dia às 07h do dia seguinte). Ele substitui o livro escrito à mão pelo encarregado e será conferido e assinado.
Estrutura, em Markdown simples:
1. "Resumo do dia" (3 a 5 linhas).
2. "Rondas": por turno (dia e noite), quantas e quais locais, destacando as com alteração.
3. "Ocorrências": cada uma em ordem de horário, com número, horário, local, descrição, setor e situação.
4. "Controle de acesso": totais e pendências (sem saída, sem Invenzi).
5. "Acessibilidade": atendimentos feitos.
6. "Pendências para o próximo dia".
Use os horários dos dados. Linguagem formal e objetiva.`,
    serializar(dados),
  );
  return db.livroDiario.upsert({
    where: { data: dataParaBanco(dataISO) },
    create: { data: dataParaBanco(dataISO), conteudo: texto },
    update: { conteudo: texto, geradoEm: new Date(), conferidoPor: null, conferidoEm: null },
  });
}

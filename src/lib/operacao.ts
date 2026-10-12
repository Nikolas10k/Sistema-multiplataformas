import { z } from "zod";
import type { Canal, Local, Usuario } from "@prisma/client";
import { db } from "./db";
import { notificarSetor } from "./notificacoes";
import { podeGerirOcorrencias } from "./permissoes";
import { partesSP, plantaoEm, type Plantao } from "./tempo";

// Funções de negócio usadas tanto pelas telas quanto pelo agente.

export class ErroOperacao extends Error {}

// ------------------------------------------------------------------
// Locais
// ------------------------------------------------------------------

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[º°ª]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Converte jeitos comuns de falar ("5º andar", "G2", "praça") no nome cadastrado. */
function aliases(texto: string): string[] {
  const t = normalizar(texto);
  const saida = [t];
  const andar = t.match(/(\d+)\s*(o\s*)?andar|andar\s*(\d+)/);
  if (andar) saida.push(`andar ${andar[1] ?? andar[3]}`);
  const subsolo = t.match(/^(g|ss|subsolo|garagem)\s*-?\s*(\d)$/) ?? t.match(/(\d)\s*(o\s*)?subsolo/);
  if (subsolo) saida.push(`subsolo ${subsolo[2] ?? subsolo[1]}`);
  if (/praca|alimentacao|food/.test(t)) saida.push("praca de alimentacao");
  if (/loja/.test(t)) saida.push("lojas");
  return saida;
}

export async function resolverLocal(texto: string): Promise<{ local?: Local; candidatos: Local[] }> {
  const locais = await db.local.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } });
  const chaves = aliases(texto);
  const exato = locais.find((l) => chaves.includes(normalizar(l.nome)));
  if (exato) return { local: exato, candidatos: [] };
  const parciais = locais.filter((l) => chaves.some((c) => normalizar(l.nome).includes(c) || c.includes(normalizar(l.nome))));
  if (parciais.length === 1) return { local: parciais[0], candidatos: [] };
  return { candidatos: parciais.slice(0, 10) };
}

async function exigirLocal(texto: string): Promise<Local> {
  const { local, candidatos } = await resolverLocal(texto);
  if (local) return local;
  const sugestao = candidatos.length
    ? ` Você quis dizer: ${candidatos.map((c) => c.nome).join(", ")}?`
    : " Use listar_locais para ver os nomes cadastrados.";
  throw new ErroOperacao(`Local "${texto}" não encontrado.${sugestao}`);
}

// ------------------------------------------------------------------
// Rondas
// ------------------------------------------------------------------

export const RegistrarRondaInput = z.object({
  local: z.string().min(1).describe("Local da ronda, ex.: 'Andar 5', 'Subsolo 2', 'Praça de Alimentação'"),
  com_alteracao: z.boolean().default(false).describe("true se encontrou algum problema"),
  observacao: z.string().optional().describe("O que foi verificado ou encontrado"),
});

export async function registrarRonda(input: z.input<typeof RegistrarRondaInput>, usuario: Usuario, canal: Canal) {
  const dados = RegistrarRondaInput.parse(input);
  const local = await exigirLocal(dados.local);
  return db.ronda.create({
    data: {
      localId: local.id,
      porteiroId: usuario.id,
      comAlteracao: dados.com_alteracao,
      observacao: dados.observacao?.trim() || null,
      canal,
    },
    include: { local: true },
  });
}

export type SituacaoRonda = {
  local: Local;
  ultima: Date | null;
  quantidade: number;
  situacao: "OK" | "PENDENTE" | "ATRASADA" | "FECHADO";
};

/** Checklist de rondas do plantão: o que já foi rondado, o que falta e o que está atrasado. */
export async function situacaoRondas(p: Plantao = plantaoEm(), agora = new Date()): Promise<SituacaoRonda[]> {
  const [locais, rondas] = await Promise.all([
    db.local.findMany({ where: { ativo: true, exigeRonda: true }, orderBy: { ordem: "asc" } }),
    db.ronda.findMany({
      where: { realizadaEm: { gte: p.inicio, lt: p.fim } },
      select: { localId: true, realizadaEm: true },
      orderBy: { realizadaEm: "desc" },
    }),
  ]);
  const diaSemana = partesSP(agora).diaSemana;
  return locais.map((local) => {
    const doLocal = rondas.filter((r) => r.localId === local.id);
    const ultima = doLocal[0]?.realizadaEm ?? null;
    let situacao: SituacaoRonda["situacao"] = ultima ? "OK" : "PENDENTE";
    if (local.diasFechado.includes(diaSemana) && !ultima) situacao = "FECHADO";
    else if (ultima && local.intervaloRondaMin) {
      const minutos = (agora.getTime() - ultima.getTime()) / 60_000;
      if (minutos > local.intervaloRondaMin) situacao = "ATRASADA";
    } else if (!ultima && local.intervaloRondaMin) {
      const minutos = (agora.getTime() - p.inicio.getTime()) / 60_000;
      situacao = minutos > local.intervaloRondaMin ? "ATRASADA" : "PENDENTE";
    }
    return { local, ultima, quantidade: doLocal.length, situacao };
  });
}

// ------------------------------------------------------------------
// Ocorrências
// ------------------------------------------------------------------

const Categoria = z.enum([
  "SEGURANCA",
  "MANUTENCAO",
  "LIMPEZA",
  "ACESSO",
  "ACESSIBILIDADE",
  "CONVIVENCIA",
  "GARAGEM",
  "EMERGENCIA",
  "OUTRO",
]);
const Prioridade = z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]);
const SetorEnum = z.enum(["ADMINISTRACAO", "FINANCEIRO", "SUPERVISOR", "SINDICA", "PORTARIA", "RECEPCAO", "TI"]);
const StatusOcorrencia = z.enum(["ABERTA", "EM_ANDAMENTO", "RESOLVIDA"]);

export const RegistrarOcorrenciaInput = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(3),
  categoria: Categoria,
  prioridade: Prioridade.default("MEDIA"),
  setor: SetorEnum.describe("Setor que precisa resolver"),
  local: z.string().optional(),
  sala: z.string().optional(),
  fotos: z.array(z.string()).default([]).describe("Nomes de arquivo das fotos recebidas"),
});

export async function registrarOcorrencia(
  input: z.input<typeof RegistrarOcorrenciaInput>,
  usuario: Usuario,
  canal: Canal,
) {
  const dados = RegistrarOcorrenciaInput.parse(input);
  const local = dados.local ? await exigirLocal(dados.local) : null;
  const ocorrencia = await db.ocorrencia.create({
    data: {
      titulo: dados.titulo.trim(),
      descricao: dados.descricao.trim(),
      categoria: dados.categoria,
      prioridade: dados.prioridade,
      setor: dados.setor,
      localId: local?.id,
      sala: dados.sala?.trim() || null,
      fotos: dados.fotos,
      registradoPorId: usuario.id,
      canal,
    },
    include: { local: true },
  });
  let pessoasAvisadas = 0;
  if (ocorrencia.prioridade === "ALTA" || ocorrencia.prioridade === "URGENTE") {
    pessoasAvisadas = await notificarSetor(ocorrencia).catch((e) => {
      console.error("[notificacao] falhou", e);
      return 0;
    });
  }
  return { ...ocorrencia, pessoasAvisadas };
}

export const AtualizarOcorrenciaInput = z.object({
  id: z.coerce.number().int().positive(),
  status: StatusOcorrencia.optional(),
  resolucao: z.string().optional().describe("O que foi feito (obrigatório ao resolver)"),
  prioridade: Prioridade.optional(),
  setor: SetorEnum.optional(),
  complemento: z.string().optional().describe("Informação nova a acrescentar na descrição"),
});

export async function atualizarOcorrencia(input: z.input<typeof AtualizarOcorrenciaInput>, usuario: Usuario) {
  const dados = AtualizarOcorrenciaInput.parse(input);
  const atual = await db.ocorrencia.findUnique({ where: { id: dados.id } });
  if (!atual) throw new ErroOperacao(`Ocorrência #${dados.id} não existe.`);
  if (!podeGerirOcorrencias(usuario.papel) && atual.registradoPorId !== usuario.id) {
    throw new ErroOperacao("Você só pode alterar ocorrências que você registrou. Peça ao encarregado ou supervisor.");
  }
  if (dados.status === "RESOLVIDA" && !dados.resolucao?.trim()) {
    throw new ErroOperacao("Para resolver, descreva o que foi feito.");
  }
  const descricao = dados.complemento?.trim()
    ? `${atual.descricao}\n\n[${new Date().toISOString()} · ${usuario.nome}] ${dados.complemento.trim()}`
    : undefined;
  const atualizada = await db.ocorrencia.update({
    where: { id: dados.id },
    data: {
      status: dados.status,
      prioridade: dados.prioridade,
      setor: dados.setor,
      descricao,
      ...(dados.status === "RESOLVIDA"
        ? { resolucao: dados.resolucao!.trim(), resolvidaEm: new Date(), resolvidaPorId: usuario.id }
        : {}),
      ...(dados.status && dados.status !== "RESOLVIDA" ? { resolvidaEm: null, resolvidaPorId: null } : {}),
    },
    include: { local: true },
  });
  const escalou =
    (dados.prioridade === "URGENTE" && atual.prioridade !== "URGENTE") ||
    (dados.prioridade === "ALTA" && (atual.prioridade === "BAIXA" || atual.prioridade === "MEDIA")) ||
    (dados.setor && dados.setor !== atual.setor && (atualizada.prioridade === "ALTA" || atualizada.prioridade === "URGENTE"));
  let pessoasAvisadas = 0;
  if (escalou && atualizada.status !== "RESOLVIDA") {
    pessoasAvisadas = await notificarSetor(atualizada).catch((e) => {
      console.error("[notificacao] falhou", e);
      return 0;
    });
  }
  return { ...atualizada, pessoasAvisadas };
}

export const ListarOcorrenciasInput = z.object({
  status: z.enum(["ABERTAS", "RESOLVIDAS", "TODAS"]).default("ABERTAS"),
  setor: SetorEnum.optional(),
  desde_horas: z.number().int().positive().max(24 * 31).optional().describe("Só as criadas nas últimas N horas"),
  busca: z.string().optional(),
  limite: z.number().int().min(1).max(50).default(20),
});

export async function listarOcorrencias(input: z.input<typeof ListarOcorrenciasInput>) {
  const dados = ListarOcorrenciasInput.parse(input);
  return db.ocorrencia.findMany({
    where: {
      status:
        dados.status === "ABERTAS"
          ? { in: ["ABERTA", "EM_ANDAMENTO"] }
          : dados.status === "RESOLVIDAS"
            ? "RESOLVIDA"
            : undefined,
      setor: dados.setor,
      criadaEm: dados.desde_horas ? { gte: new Date(Date.now() - dados.desde_horas * 3600_000) } : undefined,
      OR: dados.busca
        ? [
            { titulo: { contains: dados.busca, mode: "insensitive" } },
            { descricao: { contains: dados.busca, mode: "insensitive" } },
            { sala: { contains: dados.busca, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { local: true, registradoPor: { select: { nome: true } } },
    orderBy: [{ criadaEm: "desc" }],
    take: dados.limite,
  });
}

// ------------------------------------------------------------------
// Controle de acesso (espelho do Invenzi)
// ------------------------------------------------------------------

export const RegistrarAcessoInput = z.object({
  nome: z.string().min(2),
  tipo: z.enum(["VISITANTE", "PRESTADOR", "ENTREGA", "CANDIDATO", "OUTRO"]).default("VISITANTE"),
  sala: z.string().optional(),
  empresa: z.string().optional().describe("Empresa visitada ou empresa do prestador"),
  documento_final: z
    .string()
    .regex(/^\d{4}$/)
    .optional()
    .describe("Apenas os 4 últimos dígitos do documento"),
  local: z.string().optional().describe("Recepção ou portaria onde entrou"),
  cadastrado_invenzi: z.boolean().default(false),
  observacao: z.string().optional(),
});

export async function registrarAcesso(input: z.input<typeof RegistrarAcessoInput>, usuario: Usuario, canal: Canal) {
  const dados = RegistrarAcessoInput.parse(input);
  const local = dados.local ? await exigirLocal(dados.local) : null;
  return db.registroAcesso.create({
    data: {
      nome: dados.nome.trim(),
      tipo: dados.tipo,
      sala: dados.sala?.trim() || null,
      empresa: dados.empresa?.trim() || null,
      documentoFinal: dados.documento_final ?? null,
      localId: local?.id,
      cadastradoInvenzi: dados.cadastrado_invenzi,
      observacao: dados.observacao?.trim() || null,
      registradoPorId: usuario.id,
      canal,
    },
  });
}

export async function registrarSaida(id: string) {
  const registro = await db.registroAcesso.findUnique({ where: { id } });
  if (!registro) throw new ErroOperacao("Registro de acesso não encontrado.");
  if (registro.saidaEm) throw new ErroOperacao(`${registro.nome} já tinha saída registrada.`);
  return db.registroAcesso.update({ where: { id }, data: { saidaEm: new Date() } });
}

export const BuscarAcessosInput = z.object({
  termo: z.string().optional().describe("Nome, sala ou empresa"),
  apenas_no_predio: z.boolean().default(false).describe("Só quem entrou e ainda não saiu"),
  ultimas_horas: z.number().int().positive().max(24 * 31).default(24),
  limite: z.number().int().min(1).max(50).default(20),
});

export async function buscarAcessos(input: z.input<typeof BuscarAcessosInput>) {
  const dados = BuscarAcessosInput.parse(input);
  return db.registroAcesso.findMany({
    where: {
      entradaEm: { gte: new Date(Date.now() - dados.ultimas_horas * 3600_000) },
      saidaEm: dados.apenas_no_predio ? null : undefined,
      OR: dados.termo
        ? [
            { nome: { contains: dados.termo, mode: "insensitive" } },
            { sala: { contains: dados.termo, mode: "insensitive" } },
            { empresa: { contains: dados.termo, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { local: true },
    orderBy: { entradaEm: "desc" },
    take: dados.limite,
  });
}

// ------------------------------------------------------------------
// Acessibilidade (PcD, idosos, gestantes)
// ------------------------------------------------------------------

export const SolicitarApoioInput = z.object({
  pessoa: z.string().min(2).describe("Nome ou descrição da pessoa"),
  necessidade: z.enum([
    "CADEIRANTE",
    "MOBILIDADE_REDUZIDA",
    "IDOSO",
    "DEFICIENCIA_VISUAL",
    "DEFICIENCIA_AUDITIVA",
    "GESTANTE",
    "OUTRO",
  ]),
  destino: z.string().optional().describe("Para onde vai (sala, loja, garagem)"),
  observacao: z.string().optional(),
});

export async function solicitarApoio(input: z.input<typeof SolicitarApoioInput>, usuario: Usuario) {
  const dados = SolicitarApoioInput.parse(input);
  return db.atendimentoAcessibilidade.create({
    data: {
      pessoa: dados.pessoa.trim(),
      necessidade: dados.necessidade,
      destino: dados.destino?.trim() || null,
      observacao: dados.observacao?.trim() || null,
      solicitadoPorId: usuario.id,
    },
  });
}

export const AtualizarApoioInput = z.object({
  id: z.string(),
  status: z.enum(["EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO"]),
});

export async function atualizarApoio(input: z.input<typeof AtualizarApoioInput>, usuario: Usuario) {
  const dados = AtualizarApoioInput.parse(input);
  const atual = await db.atendimentoAcessibilidade.findUnique({ where: { id: dados.id } });
  if (!atual) throw new ErroOperacao("Atendimento não encontrado.");
  return db.atendimentoAcessibilidade.update({
    where: { id: dados.id },
    data: {
      status: dados.status,
      atendidoPorId: dados.status === "EM_ATENDIMENTO" ? usuario.id : (atual.atendidoPorId ?? usuario.id),
      iniciadoEm: dados.status === "EM_ATENDIMENTO" ? new Date() : atual.iniciadoEm,
      concluidoEm: dados.status !== "EM_ATENDIMENTO" ? new Date() : null,
    },
  });
}

export async function apoiosPendentes() {
  return db.atendimentoAcessibilidade.findMany({
    where: { status: { in: ["SOLICITADO", "EM_ATENDIMENTO"] } },
    include: { atendidoPor: { select: { nome: true } } },
    orderBy: { criadoEm: "asc" },
  });
}

// ------------------------------------------------------------------
// Consolidação (passagem de turno e livro do dia)
// ------------------------------------------------------------------

export async function dadosDoPeriodo(inicio: Date, fim: Date) {
  const [rondas, ocorrenciasCriadas, ocorrenciasResolvidas, acessos, apoios, abertas] = await Promise.all([
    db.ronda.findMany({
      where: { realizadaEm: { gte: inicio, lt: fim } },
      include: { local: true, porteiro: { select: { nome: true } } },
      orderBy: { realizadaEm: "asc" },
    }),
    db.ocorrencia.findMany({
      where: { criadaEm: { gte: inicio, lt: fim } },
      include: { local: true, registradoPor: { select: { nome: true } } },
      orderBy: { criadaEm: "asc" },
    }),
    db.ocorrencia.findMany({
      where: { resolvidaEm: { gte: inicio, lt: fim } },
      include: { resolvidaPor: { select: { nome: true } } },
      orderBy: { resolvidaEm: "asc" },
    }),
    db.registroAcesso.findMany({
      where: { entradaEm: { gte: inicio, lt: fim } },
      orderBy: { entradaEm: "asc" },
    }),
    db.atendimentoAcessibilidade.findMany({
      where: { criadoEm: { gte: inicio, lt: fim } },
      include: { atendidoPor: { select: { nome: true } } },
      orderBy: { criadoEm: "asc" },
    }),
    db.ocorrencia.findMany({
      where: { status: { in: ["ABERTA", "EM_ANDAMENTO"] } },
      include: { local: true },
      orderBy: { criadaEm: "asc" },
    }),
  ]);
  return { rondas, ocorrenciasCriadas, ocorrenciasResolvidas, acessos, apoios, abertas };
}

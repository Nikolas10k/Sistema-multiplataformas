import { z } from "zod";
import type { Canal, Usuario } from "@prisma/client";
import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { db } from "../db";
import { escalaAgora } from "../escala";
import {
  AtualizarApoioInput,
  AtualizarOcorrenciaInput,
  BuscarAcessosInput,
  ListarOcorrenciasInput,
  RegistrarAcessoInput,
  RegistrarOcorrenciaInput,
  RegistrarRondaInput,
  SolicitarApoioInput,
  apoiosPendentes,
  atualizarApoio,
  atualizarOcorrencia,
  buscarAcessos,
  listarOcorrencias,
  registrarAcesso,
  registrarOcorrencia,
  registrarRonda,
  registrarSaida,
  situacaoRondas,
  solicitarApoio,
} from "../operacao";
import { NOME_PAPEL, NOME_SETOR, podeConferirLivro } from "../permissoes";
import { formatarDataHora, formatarHora, nomeTurno, partesSP, plantaoEm, somarDias } from "../tempo";
import { gerarLivroDiario, gerarPassagemTurno } from "./relatorios";

export type ContextoFerramenta = { usuario: Usuario; canal: Canal };

type Ferramenta<S extends z.ZodType> = {
  nome: string;
  descricao: string;
  entrada: S;
  executar: (entrada: z.output<S>, ctx: ContextoFerramenta) => Promise<unknown>;
};

function ferramenta<S extends z.ZodType>(f: Ferramenta<S>) {
  return f as unknown as Ferramenta<z.ZodType>;
}

const SemEntrada = z.object({});

const FERRAMENTAS = [
  ferramenta({
    nome: "escala_atual",
    descricao:
      "Mostra o plantão em andamento, as equipes de portaria e encarregados de serviço e quais recepcionistas estão no horário agora (considerando folgas).",
    entrada: SemEntrada,
    executar: async () => {
      const { plantao, equipes, recepcionistas } = await escalaAgora();
      return {
        plantao: nomeTurno(plantao.turno),
        equipes: equipes.map((e) => ({
          equipe: e.nome,
          encarregados: e.membros.filter((m) => m.papel === "ENCARREGADO").map((m) => m.nome),
          porteiros: e.membros.filter((m) => m.papel === "PORTEIRO").map((m) => m.nome),
        })),
        recepcionistas_no_horario: recepcionistas.map((r) => `${r.nome} (${r.horaInicio}–${r.horaFim})`),
        recepcao_descoberta: recepcionistas.length === 0,
      };
    },
  }),
  ferramenta({
    nome: "listar_locais",
    descricao: "Lista os locais cadastrados do prédio (recepções, andares, subsolos, praça, lojas).",
    entrada: SemEntrada,
    executar: async () =>
      (await db.local.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } })).map((l) => l.nome),
  }),
  ferramenta({
    nome: "registrar_ronda",
    descricao:
      "Registra uma ronda feita em um local. Use uma chamada por local. Se encontrou problema, marque com_alteracao e registre também a ocorrência.",
    entrada: RegistrarRondaInput,
    executar: async (e, { usuario, canal }) => {
      const r = await registrarRonda(e, usuario, canal);
      return { ronda_id: r.id, local: r.local.nome, horario: formatarHora(r.realizadaEm) };
    },
  }),
  ferramenta({
    nome: "situacao_rondas",
    descricao: "Checklist de rondas do plantão atual: locais rondados, pendentes e atrasados.",
    entrada: SemEntrada,
    executar: async () =>
      (await situacaoRondas()).map((s) => ({
        local: s.local.nome,
        situacao: s.situacao,
        rondas_no_plantao: s.quantidade,
        ultima: s.ultima ? formatarHora(s.ultima) : null,
      })),
  }),
  ferramenta({
    nome: "registrar_ocorrencia",
    descricao:
      "Registra uma ocorrência (problema, incidente, pedido). ALTA e URGENTE avisam o setor responsável por WhatsApp automaticamente.",
    entrada: RegistrarOcorrenciaInput,
    executar: async (e, { usuario, canal }) => {
      const o = await registrarOcorrencia(e, usuario, canal);
      return {
        numero: o.id,
        setor: NOME_SETOR[o.setor],
        prioridade: o.prioridade,
        pessoas_avisadas_por_whatsapp: o.pessoasAvisadas,
        ...(o.pessoasAvisadas === 0 && (o.prioridade === "ALTA" || o.prioridade === "URGENTE")
          ? { atencao: "Ninguém do setor foi avisado (sem WhatsApp cadastrado ou envio indisponível). Oriente a avisar por telefone." }
          : {}),
      };
    },
  }),
  ferramenta({
    nome: "atualizar_ocorrencia",
    descricao:
      "Atualiza uma ocorrência pelo número: muda status, prioridade, setor, acrescenta informação ou marca como resolvida (com a resolução).",
    entrada: AtualizarOcorrenciaInput,
    executar: async (e, { usuario }) => {
      const o = await atualizarOcorrencia(e, usuario);
      return {
        numero: o.id,
        status: o.status,
        prioridade: o.prioridade,
        setor: NOME_SETOR[o.setor],
        ...(o.pessoasAvisadas ? { pessoas_avisadas_por_whatsapp: o.pessoasAvisadas } : {}),
      };
    },
  }),
  ferramenta({
    nome: "listar_ocorrencias",
    descricao: "Consulta ocorrências (por padrão as abertas), com filtros de setor, período e texto.",
    entrada: ListarOcorrenciasInput,
    executar: async (e) =>
      (await listarOcorrencias(e)).map((o) => ({
        numero: o.id,
        titulo: o.titulo,
        descricao: o.descricao.slice(0, 300),
        prioridade: o.prioridade,
        status: o.status,
        setor: NOME_SETOR[o.setor],
        local: o.local?.nome ?? null,
        sala: o.sala,
        aberta_em: formatarDataHora(o.criadaEm),
        registrada_por: o.registradoPor.nome,
        resolucao: o.resolucao,
      })),
  }),
  ferramenta({
    nome: "registrar_acesso",
    descricao:
      "Registra a entrada de visitante, prestador, entrega ou candidato. Informe se já foi cadastrado no Invenzi.",
    entrada: RegistrarAcessoInput,
    executar: async (e, { usuario, canal }) => {
      const a = await registrarAcesso(e, usuario, canal);
      return {
        registro_id: a.id,
        nome: a.nome,
        entrada: formatarHora(a.entradaEm),
        lembrete: a.cadastradoInvenzi ? null : "Ainda não confirmado no Invenzi.",
      };
    },
  }),
  ferramenta({
    nome: "registrar_saida",
    descricao:
      "Registra a saída de uma pessoa que está no prédio. Informe o registro_id, ou o nome para buscar entre quem ainda não saiu.",
    entrada: z.object({ registro_id: z.string().optional(), nome: z.string().optional() }),
    executar: async (e) => {
      let id = e.registro_id;
      if (!id) {
        if (!e.nome) return { erro: "Informe registro_id ou nome." };
        const achados = await buscarAcessos({ termo: e.nome, apenas_no_predio: true, ultimas_horas: 48 });
        if (achados.length !== 1)
          return {
            erro: achados.length ? "Mais de uma pessoa encontrada; escolha o registro_id." : "Ninguém com esse nome está no prédio.",
            candidatos: achados.map((a) => ({ registro_id: a.id, nome: a.nome, sala: a.sala, entrada: formatarHora(a.entradaEm) })),
          };
        id = achados[0].id;
      }
      const a = await registrarSaida(id);
      return { nome: a.nome, saida: formatarHora(a.saidaEm!) };
    },
  }),
  ferramenta({
    nome: "buscar_acessos",
    descricao: "Busca registros de acesso por nome, sala ou empresa; pode listar só quem ainda está no prédio.",
    entrada: BuscarAcessosInput,
    executar: async (e) =>
      (await buscarAcessos(e)).map((a) => ({
        registro_id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        sala: a.sala,
        empresa: a.empresa,
        entrada: formatarDataHora(a.entradaEm),
        saida: a.saidaEm ? formatarDataHora(a.saidaEm) : null,
        invenzi: a.cadastradoInvenzi,
      })),
  }),
  ferramenta({
    nome: "solicitar_apoio_acessibilidade",
    descricao:
      "Registra que uma pessoa com deficiência, idosa ou gestante precisa de acompanhamento, para a recepção/portaria atender.",
    entrada: SolicitarApoioInput,
    executar: async (e, { usuario }) => {
      const a = await solicitarApoio(e, usuario);
      return { atendimento_id: a.id, status: a.status };
    },
  }),
  ferramenta({
    nome: "atualizar_apoio_acessibilidade",
    descricao: "Marca um atendimento de acessibilidade como em atendimento, concluído ou cancelado.",
    entrada: AtualizarApoioInput,
    executar: async (e, { usuario }) => {
      const a = await atualizarApoio(e, usuario);
      return { atendimento_id: a.id, status: a.status };
    },
  }),
  ferramenta({
    nome: "listar_apoios_pendentes",
    descricao: "Lista atendimentos de acessibilidade aguardando ou em andamento.",
    entrada: SemEntrada,
    executar: async () =>
      (await apoiosPendentes()).map((a) => ({
        atendimento_id: a.id,
        pessoa: a.pessoa,
        necessidade: a.necessidade,
        destino: a.destino,
        status: a.status,
        desde: formatarHora(a.criadoEm),
        atendido_por: a.atendidoPor?.nome ?? null,
      })),
  }),
  ferramenta({
    nome: "gerar_passagem_turno",
    descricao:
      "Gera e salva a passagem de turno do plantão atual (pendências e resumo), para entregar à próxima equipe. Devolve o texto pronto.",
    entrada: SemEntrada,
    executar: async (_e, { usuario }) => (await gerarPassagemTurno(plantaoEm(), usuario)).resumo,
  }),
  ferramenta({
    nome: "livro_do_dia",
    descricao:
      "Consulta o livro de ocorrências digital de um dia operacional (07h às 07h). Se gerar=true, (re)gera o livro com os registros atuais. Restrito a encarregados e gestão.",
    entrada: z.object({
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("AAAA-MM-DD; padrão: dia operacional anterior"),
      gerar: z.boolean().default(false),
    }),
    executar: async (e, { usuario }) => {
      if (!podeConferirLivro(usuario.papel)) return { erro: "Apenas encarregados e gestão acessam o livro do dia." };
      const p = partesSP();
      const data = e.data ?? somarDias(p.dataISO, p.hora < 7 ? -2 : -1);
      if (e.gerar) return (await gerarLivroDiario(data)).conteudo;
      const livro = await db.livroDiario.findUnique({ where: { data: new Date(`${data}T00:00:00Z`) } });
      return livro?.conteudo ?? { aviso: `Livro de ${data} ainda não foi gerado. Chame de novo com gerar=true.` };
    },
  }),
];

export const DEFINICOES_FERRAMENTAS: BetaTool[] = FERRAMENTAS.map((f) => {
  const { $schema: _ignorado, ...schema } = z.toJSONSchema(f.entrada, { io: "input" }) as Record<string, unknown>;
  void _ignorado;
  return {
    name: f.nome,
    description: f.descricao,
    input_schema: { type: "object", ...schema } as BetaTool["input_schema"],
  };
});

/** Executa uma ferramenta pedida pelo modelo. Erros de validação/negócio voltam como texto para o modelo corrigir. */
export async function executarFerramenta(
  nome: string,
  entrada: unknown,
  ctx: ContextoFerramenta,
): Promise<{ conteudo: string; erro: boolean }> {
  const f = FERRAMENTAS.find((x) => x.nome === nome);
  if (!f) return { conteudo: `Ferramenta desconhecida: ${nome}`, erro: true };
  const validado = f.entrada.safeParse(entrada ?? {});
  if (!validado.success) return { conteudo: `Entrada inválida: ${z.prettifyError(validado.error)}`, erro: true };
  try {
    const resultado = await f.executar(validado.data, ctx);
    return { conteudo: typeof resultado === "string" ? resultado : JSON.stringify(resultado), erro: false };
  } catch (e) {
    console.error(`[agente] ferramenta ${nome} falhou`, e);
    return { conteudo: e instanceof Error ? e.message : "Erro ao executar a ferramenta.", erro: true };
  }
}

export function descreverUsuario(u: Usuario) {
  return `${u.nome} (${NOME_PAPEL[u.papel]})`;
}

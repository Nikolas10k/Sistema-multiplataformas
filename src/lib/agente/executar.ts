import type { Canal, Prisma, Usuario } from "@prisma/client";
import type {
  BetaContentBlockParam,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { db } from "../db";
import { formatarDataHora, nomeDiaSemana, nomeTurno, plantaoEm } from "../tempo";
import { criarMensagem } from "./cliente";
import { DEFINICOES_FERRAMENTAS, descreverUsuario, executarFerramenta } from "./ferramentas";
import { PROMPT_SISTEMA } from "./prompt";

const MAX_ITERACOES = 12;

export type ImagemRecebida = { arquivo: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; base64: string };
export type EntradaAgente = { texto: string; imagens?: ImagemRecebida[] };

// Uma conversa por vez por pessoa: duas mensagens seguidas no WhatsApp não podem embaralhar o histórico.
const filas = new Map<string, Promise<unknown>>();
function emFila<T>(chave: string, tarefa: () => Promise<T>): Promise<T> {
  const anterior = filas.get(chave) ?? Promise.resolve();
  const proxima = anterior.catch(() => undefined).then(tarefa);
  filas.set(chave, proxima);
  proxima.finally(() => {
    if (filas.get(chave) === proxima) filas.delete(chave);
  });
  return proxima;
}

async function obterConversa(usuario: Usuario, canal: Canal) {
  // O histórico recomeça a cada plantão: mantém o contexto curto e alinhado à passagem de turno.
  const chavePlantao = plantaoEm().chave;
  return db.conversaAgente.upsert({
    where: { usuarioId_canal_chavePlantao: { usuarioId: usuario.id, canal, chavePlantao } },
    create: { usuarioId: usuario.id, canal, chavePlantao },
    update: {},
    include: { mensagens: { orderBy: { criadaEm: "asc" } } },
  });
}

function montarMensagemUsuario(usuario: Usuario, canal: Canal, entrada: EntradaAgente): BetaMessageParam {
  const agora = new Date();
  const contexto = `[Contexto: ${formatarDataHora(agora)}, ${nomeDiaSemana(agora)} · plantão ${nomeTurno(plantaoEm(agora).turno)} · quem fala: ${descreverUsuario(usuario)} · canal: ${canal === "WHATSAPP" ? "WhatsApp" : "computador da recepção"}]`;
  const conteudo: BetaContentBlockParam[] = [];
  for (const img of entrada.imagens ?? []) {
    conteudo.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } });
  }
  const fotos = entrada.imagens?.length
    ? `\n[Fotos recebidas: ${entrada.imagens.map((i) => i.arquivo).join(", ")}]`
    : "";
  conteudo.push({ type: "text", text: `${contexto}\n${entrada.texto || "(sem texto)"}${fotos}` });
  return { role: "user", content: conteudo };
}

function textoDe(conteudo: BetaMessageParam["content"]): string {
  if (typeof conteudo === "string") return conteudo;
  return conteudo
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
}

/** Envia uma mensagem ao agente e devolve a resposta em texto. */
export function conversar(usuario: Usuario, canal: Canal, entrada: EntradaAgente): Promise<string> {
  return emFila(`${usuario.id}:${canal}`, async () => {
    const conversa = await obterConversa(usuario, canal);
    const historico: BetaMessageParam[] = conversa.mensagens.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.conteudo as unknown as BetaMessageParam["content"],
    }));
    const novas: BetaMessageParam[] = [montarMensagemUsuario(usuario, canal, entrada)];
    let resposta = "";

    for (let i = 0; i < MAX_ITERACOES; i++) {
      const msg = await criarMensagem({
        system: PROMPT_SISTEMA,
        tools: DEFINICOES_FERRAMENTAS,
        messages: [...historico, ...novas],
      });

      if (msg.stop_reason === "refusal") {
        // Não salva a rodada recusada; a próxima mensagem continua do histórico anterior.
        return "Não consegui processar essa mensagem. Pode reformular ou registrar pela tela da recepção?";
      }

      // O conteúdo da resposta volta sem alterações no histórico (inclusive blocos de raciocínio).
      novas.push({ role: "assistant", content: msg.content as unknown as BetaContentBlockParam[] });

      if (msg.stop_reason === "pause_turn") continue;

      const chamadas = msg.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
      if (msg.stop_reason !== "tool_use" || chamadas.length === 0) {
        resposta = textoDe(msg.content as unknown as BetaContentBlockParam[]);
        break;
      }

      const resultados: BetaToolResultBlockParam[] = await Promise.all(
        chamadas.map(async (c) => {
          const r = await executarFerramenta(c.name, c.input, { usuario, canal });
          return { type: "tool_result" as const, tool_use_id: c.id, content: r.conteudo, is_error: r.erro || undefined };
        }),
      );
      novas.push({ role: "user", content: resultados });
    }

    await db.$transaction(
      novas.map((m, i) =>
        db.mensagemAgente.create({
          data: {
            conversaId: conversa.id,
            role: m.role,
            conteudo: m.content as unknown as Prisma.InputJsonValue,
            // garante a ordem mesmo dentro da mesma transação
            criadaEm: new Date(Date.now() + i),
          },
        }),
      ),
    );

    return resposta || "Registrado. Precisa de mais alguma coisa?";
  });
}

/** Histórico legível (só textos) da conversa do plantão atual, para a tela de chat. */
export async function historicoVisivel(usuario: Usuario, canal: Canal) {
  const conversa = await db.conversaAgente.findUnique({
    where: { usuarioId_canal_chavePlantao: { usuarioId: usuario.id, canal, chavePlantao: plantaoEm().chave } },
    include: { mensagens: { orderBy: { criadaEm: "asc" } } },
  });
  if (!conversa) return [];
  return conversa.mensagens
    .map((m) => {
      const conteudo = m.conteudo as unknown as BetaMessageParam["content"];
      let texto = textoDe(conteudo);
      if (m.role === "user") texto = texto.replace(/^\[Contexto:[^\]]*\]\n?/, "");
      return { id: m.id, role: m.role as "user" | "assistant", texto, em: m.criadaEm };
    })
    .filter((m) => m.texto);
}

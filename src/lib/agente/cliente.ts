import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";

let instancia: Anthropic | null = null;

function cliente() {
  // Criado sob demanda: o sistema funciona (telas, WhatsApp) mesmo antes da chave ser configurada.
  instancia ??= new Anthropic();
  return instancia;
}

export const MODELO = process.env.AGENTE_MODELO || "claude-opus-5-5";

function esforco(): "low" | "medium" | "high" {
  const valor = process.env.AGENTE_ESFORCO;
  return valor === "low" || valor === "high" ? valor : "medium";
}

type Parametros = Omit<MessageCreateParamsNonStreaming, "model" | "betas" | "fallbacks" | "max_tokens"> & {
  max_tokens?: number;
};

/**
 * Chamada única ao Claude usada pelo agente e pelos relatórios.
 * `fallbacks: "default"`: se o modelo principal recusar por política, a API refaz o pedido
 * automaticamente em um modelo alternativo, na mesma chamada.
 */
export function criarMensagem(params: Parametros) {
  return cliente().beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    ...params,
    output_config: { effort: esforco(), ...params.output_config },
  });
}

type Uso = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

/** Soma o consumo de uma resposta (para limites do plano e custo por condomínio). */
export function consumoDe(uso: Uso) {
  return {
    entrada: uso.input_tokens + (uso.cache_creation_input_tokens ?? 0),
    saida: uso.output_tokens,
    cache: uso.cache_read_input_tokens ?? 0,
  };
}

export { Anthropic };

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Condominio } from "@prisma/client";
import { descriptografar } from "./cripto";

// Integração com a WhatsApp Cloud API (Meta). Cada condomínio tem o próprio número
// (phone_number_id), todos ligados ao app da plataforma na Meta.
const versao = () => process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
const base = () => `https://graph.facebook.com/${versao()}`;

export type ContaWhatsapp = { phoneNumberId: string; token: string };

/** Conta de envio do condomínio (token próprio ou o token da plataforma). */
export function contaDoCondominio(c: Pick<Condominio, "whatsappPhoneNumberId" | "whatsappTokenCripto">): ContaWhatsapp | null {
  if (!c.whatsappPhoneNumberId) return null;
  const token = c.whatsappTokenCripto ? descriptografar(c.whatsappTokenCripto) : process.env.WHATSAPP_TOKEN;
  if (!token) return null;
  return { phoneNumberId: c.whatsappPhoneNumberId, token };
}

/** Confere a assinatura X-Hub-Signature-256 enviada pela Meta. */
export function assinaturaValida(corpoBruto: string, assinatura: string | null): boolean {
  const segredo = process.env.WHATSAPP_APP_SECRET;
  if (!segredo || !assinatura?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", segredo).update(corpoBruto).digest("hex");
  const recebido = assinatura.slice("sha256=".length);
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido, "hex"), Buffer.from(esperado, "hex"));
}

// O WhatsApp limita mensagens de texto a 4096 caracteres.
function dividirTexto(texto: string, limite = 4000): string[] {
  const partes: string[] = [];
  let resto = texto;
  while (resto.length > limite) {
    let corte = resto.lastIndexOf("\n", limite);
    if (corte < limite / 2) corte = limite;
    partes.push(resto.slice(0, corte));
    resto = resto.slice(corte).trimStart();
  }
  if (resto) partes.push(resto);
  return partes;
}

async function chamar(conta: ContaWhatsapp, corpo: unknown) {
  return fetch(`${base()}/${conta.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${conta.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

/** Envia texto; devolve true se a Meta aceitou todas as partes. */
export async function enviarTexto(conta: ContaWhatsapp | null, para: string, texto: string): Promise<boolean> {
  if (!conta) {
    console.warn("[whatsapp] condomínio sem WhatsApp configurado; mensagem não enviada para", para);
    return false;
  }
  for (const parte of dividirTexto(texto)) {
    const resp = await chamar(conta, {
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body: parte, preview_url: false },
    }).catch((e) => {
      console.error("[whatsapp] erro de rede", e);
      return null;
    });
    if (!resp?.ok) {
      if (resp) console.error("[whatsapp] falha ao enviar", resp.status, await resp.text());
      return false;
    }
  }
  return true;
}

export async function marcarComoLida(conta: ContaWhatsapp | null, mensagemId: string): Promise<void> {
  if (!conta) return;
  await chamar(conta, { messaging_product: "whatsapp", status: "read", message_id: mensagemId }).catch(() => undefined);
}

/** Baixa uma mídia recebida (foto) pelo id informado no webhook. */
export async function baixarMidia(conta: ContaWhatsapp, midiaId: string): Promise<{ dados: Buffer; mimeType: string }> {
  const auth = { Authorization: `Bearer ${conta.token}` };
  const info = await fetch(`${base()}/${midiaId}`, { headers: auth });
  if (!info.ok) throw new Error(`Falha ao consultar mídia ${midiaId}: ${info.status}`);
  const { url, mime_type } = (await info.json()) as { url: string; mime_type: string };
  const arquivo = await fetch(url, { headers: auth });
  if (!arquivo.ok) throw new Error(`Falha ao baixar mídia ${midiaId}: ${arquivo.status}`);
  return { dados: Buffer.from(await arquivo.arrayBuffer()), mimeType: mime_type.split(";")[0].trim() };
}

/** Consulta o número na Meta, para validar a configuração do condomínio. */
export async function testarConta(conta: ContaWhatsapp): Promise<{ ok: boolean; numero?: string; erro?: string }> {
  try {
    const r = await fetch(`${base()}/${conta.phoneNumberId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${conta.token}` },
    });
    const j = (await r.json()) as { display_phone_number?: string; error?: { message: string } };
    if (!r.ok) return { ok: false, erro: j.error?.message ?? `HTTP ${r.status}` };
    return { ok: true, numero: j.display_phone_number };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "erro de rede" };
  }
}

/** Normaliza para só dígitos com DDI 55 (ex.: "(11) 99999-8888" -> "5511999998888"). */
export function normalizarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";
  return digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;
}

/**
 * Celulares brasileiros podem chegar no webhook sem o nono dígito (55 + DDD + 8 dígitos).
 * Devolve as duas formas para encontrar o cadastro.
 */
export function variantesTelefone(waId: string): string[] {
  const d = waId.replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 12) return [d, `${d.slice(0, 4)}9${d.slice(4)}`];
  if (d.startsWith("55") && d.length === 13 && d[4] === "9") return [d, `${d.slice(0, 4)}${d.slice(5)}`];
  return [d];
}

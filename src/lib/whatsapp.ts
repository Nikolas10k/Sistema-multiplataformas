import { createHmac, timingSafeEqual } from "node:crypto";

// Integração com a WhatsApp Cloud API (Meta).
const versao = () => process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
const base = () => `https://graph.facebook.com/${versao()}`;

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function cabecalhos() {
  return { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
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

/** Envia texto; devolve true se a Meta aceitou todas as partes. */
export async function enviarTexto(para: string, texto: string): Promise<boolean> {
  if (!whatsappConfigurado()) {
    console.warn("[whatsapp] não configurado; mensagem não enviada para", para);
    return false;
  }
  for (const parte of dividirTexto(texto)) {
    const resp = await fetch(`${base()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { ...cabecalhos(), "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: para,
        type: "text",
        text: { body: parte, preview_url: false },
      }),
    });
    if (!resp.ok) {
      console.error("[whatsapp] falha ao enviar", resp.status, await resp.text());
      return false;
    }
  }
  return true;
}

export async function marcarComoLida(mensagemId: string): Promise<void> {
  if (!whatsappConfigurado()) return;
  await fetch(`${base()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { ...cabecalhos(), "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: mensagemId }),
  }).catch(() => undefined);
}

/** Baixa uma mídia recebida (foto) pelo id informado no webhook. */
export async function baixarMidia(midiaId: string): Promise<{ dados: Buffer; mimeType: string }> {
  const info = await fetch(`${base()}/${midiaId}`, { headers: cabecalhos() });
  if (!info.ok) throw new Error(`Falha ao consultar mídia ${midiaId}: ${info.status}`);
  const { url, mime_type } = (await info.json()) as { url: string; mime_type: string };
  const arquivo = await fetch(url, { headers: cabecalhos() });
  if (!arquivo.ok) throw new Error(`Falha ao baixar mídia ${midiaId}: ${arquivo.status}`);
  return { dados: Buffer.from(await arquivo.arrayBuffer()), mimeType: mime_type.split(";")[0].trim() };
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

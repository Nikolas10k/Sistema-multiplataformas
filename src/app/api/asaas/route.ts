import { timingSafeEqual } from "node:crypto";
import { processarEventoAsaas } from "@/lib/cobranca/assinatura";

function tokenValido(recebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || !recebido || recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

// Webhook de cobranças do Asaas. Configure o mesmo token em ASAAS_WEBHOOK_TOKEN.
export async function POST(request: Request) {
  if (!tokenValido(request.headers.get("asaas-access-token"))) {
    return new Response("Não autorizado", { status: 401 });
  }
  let evento: unknown;
  try {
    evento = await request.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }
  try {
    const resultado = await processarEventoAsaas(evento as Parameters<typeof processarEventoAsaas>[0]);
    return Response.json({ resultado });
  } catch (e) {
    console.error("[asaas] erro ao processar webhook", e);
    // 500 faz o Asaas reenviar depois
    return new Response("Erro", { status: 500 });
  }
}

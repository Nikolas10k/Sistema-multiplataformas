import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Verificação de saúde para monitoramento e orquestrador (Docker/balanceador).
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, banco: "ok", em: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false, banco: "erro" }, { status: 503 });
  }
}

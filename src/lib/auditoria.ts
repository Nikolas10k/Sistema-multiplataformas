import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Registra ações importantes (login, mudanças de configuração, cobrança, status). Nunca derruba a operação. */
export async function auditar(acao: string, autor: string, condominioId?: string | null, detalhes?: Prisma.InputJsonValue) {
  try {
    await db.eventoAuditoria.create({ data: { acao, autor, condominioId: condominioId ?? null, detalhes } });
  } catch (e) {
    console.error("[auditoria] falhou", acao, e);
  }
}

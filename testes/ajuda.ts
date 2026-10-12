import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { contextoDe, type Contexto } from "@/lib/auth";
import type { Papel } from "@prisma/client";

export const sufixo = () => randomBytes(4).toString("hex");

/** Cria um condomínio mínimo com um local e um usuário, e devolve o contexto desse usuário. */
export async function novoCondominio(papel: Papel = "PORTEIRO", extras: Record<string, unknown> = {}): Promise<Contexto> {
  const s = sufixo();
  const c = await db.condominio.create({
    data: {
      nome: `Teste ${s}`,
      slug: `teste-${s}`,
      responsavelNome: "Resp",
      responsavelEmail: `r${s}@t.com`,
      status: "ATIVO",
      ...extras,
    },
  });
  await db.local.createMany({
    data: [
      { condominioId: c.id, nome: "Andar 5", tipo: "ANDAR", ordem: 105 },
      { condominioId: c.id, nome: "Subsolo 2", tipo: "SUBSOLO", ordem: 402 },
    ],
  });
  const u = await db.usuario.create({
    data: { condominioId: c.id, nome: `Pessoa ${s}`, login: `p${s}`, senhaHash: "x", papel },
    include: { condominio: true },
  });
  return contextoDe(u);
}

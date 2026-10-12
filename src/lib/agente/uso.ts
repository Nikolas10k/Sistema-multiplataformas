import type { Condominio, Plano } from "@prisma/client";
import { db } from "../db";
import { mesAtual, relogioDe } from "../tempo";

export type Consumo = { entrada: number; saida: number; cache: number };

/** Se o plano tem limite de mensagens do agente por mês, verifica se ainda há saldo. */
export async function dentroDoLimite(c: Condominio & { plano: Plano | null }): Promise<boolean> {
  const limite = c.plano?.maxMensagensMes;
  if (!limite) return true;
  const uso = await db.usoMensal.findUnique({
    where: { condominioId_mes: { condominioId: c.id, mes: mesAtual(relogioDe(c)) } },
  });
  return (uso?.mensagens ?? 0) < limite;
}

export async function registrarUso(c: Condominio, consumo: Consumo, mensagens = 1) {
  const mes = mesAtual(relogioDe(c));
  await db.usoMensal.upsert({
    where: { condominioId_mes: { condominioId: c.id, mes } },
    create: { condominioId: c.id, mes, mensagens, tokensEntrada: consumo.entrada, tokensSaida: consumo.saida, tokensCache: consumo.cache },
    update: {
      mensagens: { increment: mensagens },
      tokensEntrada: { increment: consumo.entrada },
      tokensSaida: { increment: consumo.saida },
      tokensCache: { increment: consumo.cache },
    },
  });
}

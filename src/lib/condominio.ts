import type { Condominio } from "@prisma/client";

export const NOME_PRODUTO = process.env.NOME_PRODUTO || "Givance Condomínio";
export const DIAS_TESTE = Number(process.env.DIAS_TESTE ?? 14);
export const DIAS_CARENCIA = Number(process.env.DIAS_CARENCIA ?? 7);

export type SituacaoAcesso = {
  liberado: boolean;
  motivo?: "TESTE_EXPIRADO" | "INADIMPLENTE" | "SUSPENSO" | "CANCELADO";
  aviso?: string; // faixa mostrada no topo quando ainda liberado
};

/** Decide se o condomínio pode usar o sistema agora. */
export function situacaoAcesso(c: Pick<Condominio, "status" | "testeAte" | "inadimplenteDesde">, agora = new Date()): SituacaoAcesso {
  switch (c.status) {
    case "ATIVO":
      return { liberado: true };
    case "TESTE": {
      if (!c.testeAte || c.testeAte > agora) {
        const dias = c.testeAte ? Math.ceil((c.testeAte.getTime() - agora.getTime()) / 86_400_000) : null;
        return {
          liberado: true,
          aviso: dias !== null ? `Período de teste: ${dias} dia${dias === 1 ? "" : "s"} restante${dias === 1 ? "" : "s"}.` : undefined,
        };
      }
      return { liberado: false, motivo: "TESTE_EXPIRADO" };
    }
    case "INADIMPLENTE": {
      const limite = new Date((c.inadimplenteDesde ?? agora).getTime() + DIAS_CARENCIA * 86_400_000);
      if (limite > agora) {
        return { liberado: true, aviso: "Há uma fatura vencida. Regularize para evitar a suspensão do acesso." };
      }
      return { liberado: false, motivo: "INADIMPLENTE" };
    }
    case "SUSPENSO":
      return { liberado: false, motivo: "SUSPENSO" };
    case "CANCELADO":
      return { liberado: false, motivo: "CANCELADO" };
  }
}

export function slugificar(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "condominio"
  );
}

export const NOME_STATUS: Record<Condominio["status"], string> = {
  TESTE: "Em teste",
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  SUSPENSO: "Suspenso",
  CANCELADO: "Cancelado",
};

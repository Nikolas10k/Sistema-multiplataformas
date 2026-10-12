import type { Papel, Setor } from "@prisma/client";

export const NOME_PAPEL: Record<Papel, string> = {
  TI_ADMIN: "TI / Administrador do sistema",
  SINDICA: "Síndico(a)",
  ADMINISTRACAO: "Administração",
  FINANCEIRO: "Financeiro",
  SUPERVISOR: "Supervisor",
  ENCARREGADO: "Encarregado",
  PORTEIRO: "Porteiro",
  RECEPCIONISTA: "Recepcionista",
};

export const NOME_SETOR: Record<Setor, string> = {
  ADMINISTRACAO: "Administração",
  FINANCEIRO: "Financeiro",
  SUPERVISOR: "Supervisor",
  SINDICA: "Síndico(a)",
  PORTARIA: "Portaria",
  RECEPCAO: "Recepção",
  TI: "TI",
};

/** Quem recebe os avisos de cada setor. */
export const PAPEIS_DO_SETOR: Record<Setor, Papel[]> = {
  ADMINISTRACAO: ["ADMINISTRACAO"],
  FINANCEIRO: ["FINANCEIRO"],
  SUPERVISOR: ["SUPERVISOR"],
  SINDICA: ["SINDICA"],
  PORTARIA: ["ENCARREGADO"],
  RECEPCAO: ["RECEPCIONISTA"],
  TI: ["TI_ADMIN"],
};

const GESTAO: Papel[] = ["TI_ADMIN", "SINDICA", "ADMINISTRACAO", "FINANCEIRO", "SUPERVISOR"];

export function ehGestao(papel: Papel): boolean {
  return GESTAO.includes(papel);
}

/** Pode mudar status de qualquer ocorrência (os demais só das que registraram). */
export function podeGerirOcorrencias(papel: Papel): boolean {
  return ehGestao(papel) || papel === "ENCARREGADO";
}

export function podeConferirLivro(papel: Papel): boolean {
  return ehGestao(papel) || papel === "ENCARREGADO";
}

export function podeAdministrarSistema(papel: Papel): boolean {
  return papel === "TI_ADMIN" || papel === "ADMINISTRACAO" || papel === "SINDICA";
}

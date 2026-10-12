import type { Prioridade, StatusOcorrencia } from "@prisma/client";

export function Avisos({ ok, erro }: { ok?: string; erro?: string }) {
  return (
    <>
      {erro && <div className="aviso erro">{erro}</div>}
      {ok && <div className="aviso sucesso">{ok}</div>}
    </>
  );
}

const CLASSE_PRIORIDADE: Record<Prioridade, string> = { BAIXA: "", MEDIA: "info", ALTA: "alerta", URGENTE: "perigo" };
const NOME_PRIORIDADE: Record<Prioridade, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente" };

export function SeloPrioridade({ p }: { p: Prioridade }) {
  return <span className={`selo ${CLASSE_PRIORIDADE[p]}`}>{NOME_PRIORIDADE[p]}</span>;
}

const NOME_STATUS: Record<StatusOcorrencia, string> = { ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", RESOLVIDA: "Resolvida" };
export function SeloStatus({ s }: { s: StatusOcorrencia }) {
  return <span className={`selo ${s === "RESOLVIDA" ? "ok" : s === "EM_ANDAMENTO" ? "info" : "alerta"}`}>{NOME_STATUS[s]}</span>;
}

export const CATEGORIAS = [
  ["SEGURANCA", "Segurança"],
  ["MANUTENCAO", "Manutenção"],
  ["LIMPEZA", "Limpeza"],
  ["ACESSO", "Acesso"],
  ["ACESSIBILIDADE", "Acessibilidade"],
  ["CONVIVENCIA", "Convivência"],
  ["GARAGEM", "Garagem"],
  ["EMERGENCIA", "Emergência"],
  ["OUTRO", "Outro"],
] as const;

export const NECESSIDADES = [
  ["CADEIRANTE", "Cadeirante"],
  ["MOBILIDADE_REDUZIDA", "Mobilidade reduzida"],
  ["IDOSO", "Idoso"],
  ["DEFICIENCIA_VISUAL", "Deficiência visual"],
  ["DEFICIENCIA_AUDITIVA", "Deficiência auditiva"],
  ["GESTANTE", "Gestante"],
  ["OUTRO", "Outro"],
] as const;

export type ParamsAviso = Promise<{ ok?: string; erro?: string }>;

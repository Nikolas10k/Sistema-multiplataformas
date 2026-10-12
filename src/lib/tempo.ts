import type { Turno } from "@prisma/client";

// O Brasil não tem horário de verão desde 2019: São Paulo é sempre UTC-3.
const OFFSET_HORAS = -3;
const OFFSET_ISO = "-03:00";
export const FUSO = "America/Sao_Paulo";

export const HORA_INICIO_DIA = 7;
export const HORA_INICIO_NOITE = 19;

export type PartesSP = {
  dataISO: string; // AAAA-MM-DD
  hora: number;
  minuto: number;
  hhmm: string; // HH:MM
  diaSemana: number; // 0 = domingo
};

export function partesSP(instante: Date = new Date()): PartesSP {
  const sp = new Date(instante.getTime() + OFFSET_HORAS * 3600_000);
  const hora = sp.getUTCHours();
  const minuto = sp.getUTCMinutes();
  return {
    dataISO: sp.toISOString().slice(0, 10),
    hora,
    minuto,
    hhmm: `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`,
    diaSemana: sp.getUTCDay(),
  };
}

/** Instante correspondente a uma data e hora no horário de São Paulo. */
export function instanteSP(dataISO: string, hhmm = "00:00"): Date {
  return new Date(`${dataISO}T${hhmm}:00${OFFSET_ISO}`);
}

export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Valor para colunas @db.Date do Prisma. */
export function dataParaBanco(dataISO: string): Date {
  return new Date(`${dataISO}T00:00:00Z`);
}

export function dataDoBanco(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function diaSemanaDe(dataISO: string): number {
  return new Date(`${dataISO}T12:00:00Z`).getUTCDay();
}

export type Plantao = {
  data: string; // data em que o plantão começou
  turno: Turno;
  inicio: Date;
  fim: Date;
  chave: string; // ex.: 2026-10-12:DIA
};

export function plantao(data: string, turno: Turno): Plantao {
  const inicio =
    turno === "DIA" ? instanteSP(data, "07:00") : instanteSP(data, "19:00");
  const fim =
    turno === "DIA" ? instanteSP(data, "19:00") : instanteSP(somarDias(data, 1), "07:00");
  return { data, turno, inicio, fim, chave: `${data}:${turno}` };
}

/** Plantão de portaria em andamento num instante (07h–19h dia, 19h–07h noite). */
export function plantaoEm(instante: Date = new Date()): Plantao {
  const p = partesSP(instante);
  if (p.hora >= HORA_INICIO_DIA && p.hora < HORA_INICIO_NOITE) return plantao(p.dataISO, "DIA");
  if (p.hora >= HORA_INICIO_NOITE) return plantao(p.dataISO, "NOITE");
  return plantao(somarDias(p.dataISO, -1), "NOITE");
}

export function plantaoAnterior(atual: Plantao): Plantao {
  return atual.turno === "DIA"
    ? plantao(somarDias(atual.data, -1), "NOITE")
    : plantao(atual.data, "DIA");
}

export function plantaoSeguinte(atual: Plantao): Plantao {
  return atual.turno === "DIA"
    ? plantao(atual.data, "NOITE")
    : plantao(somarDias(atual.data, 1), "DIA");
}

/** Dia operacional: das 07h da data às 07h do dia seguinte (turno do dia + turno da noite). */
export function diaOperacional(dataISO: string): { inicio: Date; fim: Date } {
  return { inicio: instanteSP(dataISO, "07:00"), fim: instanteSP(somarDias(dataISO, 1), "07:00") };
}

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const fmtDiaSemana = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long" });

export function formatarDataHora(d: Date): string {
  return fmtDataHora.format(d);
}

export function formatarHora(d: Date): string {
  return fmtHora.format(d);
}

export function formatarData(dataISO: string): string {
  const [a, m, d] = dataISO.split("-");
  return `${d}/${m}/${a}`;
}

export function nomeDiaSemana(d: Date = new Date()): string {
  return fmtDiaSemana.format(d);
}

export function nomeTurno(turno: Turno): string {
  return turno === "DIA" ? "Dia (07h–19h)" : "Noite (19h–07h)";
}

/** Instante de N horas atrás (para filtros "últimas 24h"). */
export function horasAtras(horas: number): Date {
  return new Date(Date.now() - horas * 3600_000);
}

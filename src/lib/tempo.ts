import type { Turno } from "@prisma/client";

// Fusos do Brasil (sem horário de verão desde 2019): deslocamento fixo em relação ao UTC.
export const FUSOS: Record<string, { nome: string; offsetHoras: number }> = {
  "America/Sao_Paulo": { nome: "Brasília (SP, RJ, MG, Sul, GO, DF…)", offsetHoras: -3 },
  "America/Bahia": { nome: "Bahia", offsetHoras: -3 },
  "America/Fortaleza": { nome: "Nordeste (CE, RN, PB, PI, MA)", offsetHoras: -3 },
  "America/Recife": { nome: "Pernambuco", offsetHoras: -3 },
  "America/Belem": { nome: "Pará e Amapá", offsetHoras: -3 },
  "America/Manaus": { nome: "Amazonas", offsetHoras: -4 },
  "America/Cuiaba": { nome: "Mato Grosso e MS", offsetHoras: -4 },
  "America/Porto_Velho": { nome: "Rondônia e Roraima", offsetHoras: -4 },
  "America/Rio_Branco": { nome: "Acre", offsetHoras: -5 },
  "America/Noronha": { nome: "Fernando de Noronha", offsetHoras: -2 },
};

/** Configuração de horário de um condomínio: fuso e início dos turnos. */
export type Relogio = { fuso: string; offsetHoras: number; inicioDia: string; inicioNoite: string };

export function relogioDe(c: { fuso: string; horaInicioDia: string; horaInicioNoite: string }): Relogio {
  const fuso = FUSOS[c.fuso] ? c.fuso : "America/Sao_Paulo";
  return { fuso, offsetHoras: FUSOS[fuso].offsetHoras, inicioDia: c.horaInicioDia, inicioNoite: c.horaInicioNoite };
}

export const RELOGIO_PADRAO: Relogio = relogioDe({ fuso: "America/Sao_Paulo", horaInicioDia: "07:00", horaInicioNoite: "19:00" });

export const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

function offsetISO(r: Relogio) {
  const h = Math.abs(r.offsetHoras);
  return `${r.offsetHoras < 0 ? "-" : "+"}${String(h).padStart(2, "0")}:00`;
}

export type PartesLocais = {
  dataISO: string; // AAAA-MM-DD
  hora: number;
  minuto: number;
  hhmm: string; // HH:MM
  diaSemana: number; // 0 = domingo
};

export function partesLocais(r: Relogio, instante: Date = new Date()): PartesLocais {
  const local = new Date(instante.getTime() + r.offsetHoras * 3600_000);
  const hora = local.getUTCHours();
  const minuto = local.getUTCMinutes();
  return {
    dataISO: local.toISOString().slice(0, 10),
    hora,
    minuto,
    hhmm: `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`,
    diaSemana: local.getUTCDay(),
  };
}

/** Instante correspondente a uma data e hora locais do condomínio. */
export function instanteLocal(r: Relogio, dataISO: string, hhmm = "00:00"): Date {
  return new Date(`${dataISO}T${hhmm}:00${offsetISO(r)}`);
}

export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function somarMinutos(hhmm: string, minutos: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Valor para colunas @db.Date do Prisma. */
export function dataParaBanco(dataISO: string): Date {
  return new Date(`${dataISO}T00:00:00Z`);
}

export function dataDoBanco(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type Plantao = {
  data: string; // data em que o plantão começou
  turno: Turno;
  inicio: Date;
  fim: Date;
  chave: string; // ex.: 2026-10-12:DIA
};

export function plantao(r: Relogio, data: string, turno: Turno): Plantao {
  const inicio = instanteLocal(r, data, turno === "DIA" ? r.inicioDia : r.inicioNoite);
  const fim =
    turno === "DIA" ? instanteLocal(r, data, r.inicioNoite) : instanteLocal(r, somarDias(data, 1), r.inicioDia);
  return { data, turno, inicio, fim, chave: `${data}:${turno}` };
}

/** Plantão em andamento num instante (dia: inicioDia→inicioNoite; noite: inicioNoite→inicioDia do dia seguinte). */
export function plantaoEm(r: Relogio, instante: Date = new Date()): Plantao {
  const p = partesLocais(r, instante);
  if (p.hhmm >= r.inicioDia && p.hhmm < r.inicioNoite) return plantao(r, p.dataISO, "DIA");
  if (p.hhmm >= r.inicioNoite) return plantao(r, p.dataISO, "NOITE");
  return plantao(r, somarDias(p.dataISO, -1), "NOITE");
}

export function plantaoSeguinte(r: Relogio, atual: Plantao): Plantao {
  return atual.turno === "DIA" ? plantao(r, atual.data, "NOITE") : plantao(r, somarDias(atual.data, 1), "DIA");
}

/** Dia operacional: do início do turno do dia até o início do turno do dia seguinte. */
export function diaOperacional(r: Relogio, dataISO: string): { inicio: Date; fim: Date } {
  return { inicio: instanteLocal(r, dataISO, r.inicioDia), fim: instanteLocal(r, somarDias(dataISO, 1), r.inicioDia) };
}

/** Último dia operacional já encerrado. */
export function ultimoDiaEncerrado(r: Relogio, instante: Date = new Date()): string {
  const p = partesLocais(r, instante);
  return somarDias(p.dataISO, p.hhmm < r.inicioDia ? -2 : -1);
}

export function mesAtual(r: Relogio, instante: Date = new Date()): string {
  return partesLocais(r, instante).dataISO.slice(0, 7);
}

const formatadores = new Map<string, Intl.DateTimeFormat>();
function fmt(fuso: string, tipo: "dataHora" | "hora" | "semana") {
  const chave = `${fuso}:${tipo}`;
  let f = formatadores.get(chave);
  if (!f) {
    const opcoes: Intl.DateTimeFormatOptions =
      tipo === "dataHora"
        ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
        : tipo === "hora"
          ? { hour: "2-digit", minute: "2-digit" }
          : { weekday: "long" };
    f = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...opcoes });
    formatadores.set(chave, f);
  }
  return f;
}

export function formatarDataHora(r: Relogio, d: Date): string {
  return fmt(r.fuso, "dataHora").format(d);
}

export function formatarHora(r: Relogio, d: Date): string {
  return fmt(r.fuso, "hora").format(d);
}

export function nomeDiaSemana(r: Relogio, d: Date = new Date()): string {
  return fmt(r.fuso, "semana").format(d);
}

export function formatarData(dataISO: string): string {
  const [a, m, d] = dataISO.split("-");
  return `${d}/${m}/${a}`;
}

export function nomeTurno(r: Relogio, turno: Turno): string {
  const h = (hhmm: string) => (hhmm.endsWith(":00") ? `${hhmm.slice(0, 2)}h` : hhmm.replace(":", "h"));
  return turno === "DIA" ? `Dia (${h(r.inicioDia)}–${h(r.inicioNoite)})` : `Noite (${h(r.inicioNoite)}–${h(r.inicioDia)})`;
}

/** Instante de N horas atrás (para filtros "últimas 24h"). */
export function horasAtras(horas: number): Date {
  return new Date(Date.now() - horas * 3600_000);
}

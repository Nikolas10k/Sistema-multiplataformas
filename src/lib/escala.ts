import type { Equipe, Usuario } from "@prisma/client";
import { db } from "./db";
import { dataDoBanco, partesSP, plantaoEm, type Plantao } from "./tempo";

function diasEntre(aISO: string, bISO: string): number {
  return Math.round(
    (new Date(`${bISO}T12:00:00Z`).getTime() - new Date(`${aISO}T12:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Em 12x36 a equipe trabalha um plantão e folga o seguinte do mesmo turno (dias alternados). */
export function equipeTrabalhaNoPlantao(equipe: Pick<Equipe, "turno" | "dataReferencia">, p: Plantao): boolean {
  if (equipe.turno !== p.turno) return false;
  return Math.abs(diasEntre(dataDoBanco(equipe.dataReferencia), p.data)) % 2 === 0;
}

export async function equipesDoPlantao(p: Plantao) {
  const equipes = await db.equipe.findMany({
    include: { membros: { where: { ativo: true }, orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });
  return equipes.filter((e) => equipeTrabalhaNoPlantao(e, p));
}

export function recepcionistaTrabalhando(u: Usuario, instante: Date): boolean {
  if (!u.horaInicio || !u.horaFim) return false;
  const p = partesSP(instante);
  if (u.diaFolga !== null && u.diaFolga === p.diaSemana) return false;
  return p.hhmm >= u.horaInicio && p.hhmm < u.horaFim;
}

export async function recepcionistasEm(instante: Date = new Date()) {
  const todas = await db.usuario.findMany({
    where: { papel: "RECEPCIONISTA", ativo: true },
    orderBy: { horaInicio: "asc" },
  });
  return todas.filter((u) => recepcionistaTrabalhando(u, instante));
}

export async function escalaAgora(instante: Date = new Date()) {
  const p = plantaoEm(instante);
  const [equipes, recepcionistas] = await Promise.all([equipesDoPlantao(p), recepcionistasEm(instante)]);
  return { plantao: p, equipes, recepcionistas };
}

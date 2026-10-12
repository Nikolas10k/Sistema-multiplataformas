import { PrismaClient, type Papel, type TipoLocal } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// Dados iniciais. Pode rodar mais de uma vez: não duplica nada.
const db = new PrismaClient();

function hojeSP() {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
}
function dataBanco(iso: string, somarDias = 0) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + somarDias);
  return d;
}

async function main() {
  // Administrador (TI)
  const login = (process.env.SEED_ADMIN_LOGIN || "admin").toLowerCase();
  if (!(await db.usuario.findUnique({ where: { login } }))) {
    const senha = process.env.SEED_ADMIN_SENHA || randomBytes(6).toString("hex");
    await db.usuario.create({
      data: { nome: "Administrador TI", login, papel: "TI_ADMIN", senhaHash: await bcrypt.hash(senha, 10) },
    });
    console.log(`Usuário administrador criado: login "${login}"${process.env.SEED_ADMIN_SENHA ? "" : `, senha "${senha}"`}`);
  }

  // Equipes da portaria (12x36). A e B no dia, C e D na noite, alternando a partir de hoje.
  const hoje = hojeSP();
  const equipes: [string, "DIA" | "NOITE", number][] = [
    ["A", "DIA", 0],
    ["B", "DIA", -1],
    ["C", "NOITE", 0],
    ["D", "NOITE", -1],
  ];
  for (const [nome, turno, desloc] of equipes) {
    await db.equipe.upsert({
      where: { nome },
      create: { nome, turno, dataReferencia: dataBanco(hoje, desloc) },
      update: {},
    });
  }

  // Locais do prédio
  const andares = Number(process.env.SEED_ANDARES ?? 20);
  const locais: { nome: string; tipo: TipoLocal; ordem: number; diasFechado?: number[] }[] = [
    { nome: "Recepção Principal", tipo: "RECEPCAO", ordem: 1 },
    ...Array.from({ length: andares }, (_, i) => ({ nome: `Andar ${i + 1}`, tipo: "ANDAR" as const, ordem: 100 + i + 1 })),
    { nome: "Subsolo 1", tipo: "SUBSOLO", ordem: 201 },
    { nome: "Subsolo 2", tipo: "SUBSOLO", ordem: 202 },
    { nome: "Subsolo 3", tipo: "SUBSOLO", ordem: 203 },
    { nome: "Praça de Alimentação", tipo: "PRACA_ALIMENTACAO", ordem: 301, diasFechado: [0] },
    { nome: "Lojas", tipo: "LOJAS", ordem: 401 },
  ];
  for (const l of locais) {
    await db.local.upsert({ where: { nome: l.nome }, create: { ...l, diasFechado: l.diasFechado ?? [] }, update: {} });
  }

  // Usuários de demonstração (só para testar localmente)
  if (process.env.SEED_DEMO === "true") {
    const senhaHash = await bcrypt.hash("demo123", 10);
    const equipeA = await db.equipe.findUnique({ where: { nome: "A" } });
    const equipeC = await db.equipe.findUnique({ where: { nome: "C" } });
    const demo: { nome: string; login: string; papel: Papel; equipeId?: string; horaInicio?: string; horaFim?: string; diaFolga?: number }[] = [
      { nome: "Carlos (Encarregado A)", login: "carlos", papel: "ENCARREGADO", equipeId: equipeA?.id },
      { nome: "Paulo (Porteiro A)", login: "paulo", papel: "PORTEIRO", equipeId: equipeA?.id },
      { nome: "Marta (Encarregada C)", login: "marta", papel: "ENCARREGADO", equipeId: equipeC?.id },
      { nome: "Ana (Recepção manhã)", login: "ana", papel: "RECEPCIONISTA", horaInicio: "07:00", horaFim: "13:00", diaFolga: 0 },
      { nome: "Bia (Recepção manhã)", login: "bia", papel: "RECEPCIONISTA", horaInicio: "07:00", horaFim: "13:00", diaFolga: 6 },
      { nome: "Clara (Recepção tarde)", login: "clara", papel: "RECEPCIONISTA", horaInicio: "13:00", horaFim: "19:00", diaFolga: 0 },
      { nome: "Sérgio (Supervisor)", login: "sergio", papel: "SUPERVISOR" },
    ];
    for (const u of demo) {
      await db.usuario.upsert({ where: { login: u.login }, create: { ...u, senhaHash }, update: {} });
    }
    console.log('Usuários de demonstração criados (senha "demo123").');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

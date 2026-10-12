import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// Dados iniciais da plataforma. Pode rodar mais de uma vez: não duplica nada.
//  - Planos padrão
//  - Administrador da plataforma (PLATAFORMA_ADMIN_EMAIL / PLATAFORMA_ADMIN_SENHA)
//  - Opcional (SEED_DEMO=true): um condomínio de demonstração com equipe fictícia
const db = new PrismaClient();

const PLANOS = [
  { nome: "Essencial", descricao: "Até 15 usuários e 1.500 mensagens do agente por mês.", precoMensal: "397.00", maxUsuarios: 15, maxMensagensMes: 1500, ordem: 1 },
  { nome: "Profissional", descricao: "Até 40 usuários e 5.000 mensagens do agente por mês.", precoMensal: "797.00", maxUsuarios: 40, maxMensagensMes: 5000, ordem: 2 },
  { nome: "Corporativo", descricao: "Usuários e mensagens ilimitados.", precoMensal: "1497.00", maxUsuarios: null, maxMensagensMes: null, ordem: 3 },
];

function hojeSP(desloc = 0) {
  const d = new Date(Date.now() - 3 * 3600_000);
  d.setUTCDate(d.getUTCDate() + desloc);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);
}

async function main() {
  for (const p of PLANOS) {
    await db.plano.upsert({
      where: { nome: p.nome },
      create: { ...p, precoMensal: new Prisma.Decimal(p.precoMensal) },
      update: {},
    });
  }

  const email = (process.env.PLATAFORMA_ADMIN_EMAIL || "admin@plataforma.local").toLowerCase();
  if (!(await db.adminPlataforma.findUnique({ where: { email } }))) {
    const senha = process.env.PLATAFORMA_ADMIN_SENHA || randomBytes(9).toString("base64url");
    await db.adminPlataforma.create({ data: { nome: "Administrador", email, senhaHash: await bcrypt.hash(senha, 10) } });
    console.log(`Administrador da plataforma criado: ${email}${process.env.PLATAFORMA_ADMIN_SENHA ? "" : ` / senha ${senha}`}`);
  }

  if (process.env.SEED_DEMO === "true" && !(await db.condominio.findUnique({ where: { slug: "demonstracao" } }))) {
    const plano = await db.plano.findFirst({ orderBy: { ordem: "asc" } });
    const c = await db.condominio.create({
      data: {
        nome: "Edifício Demonstração",
        slug: "demonstracao",
        tipo: "COMERCIAL",
        perfil:
          "- 800 salas comerciais em 20 andares.\n- 3 subsolos de garagem.\n- Lojas na área externa e praça de alimentação (fechada aos domingos).\n- Portaria 12x36: dia com 6 porteiros, noite com 5. Recepção 6x1 das 07h às 19h.\n- Controle de acesso no sistema Invenzi, nas recepções e na garagem.",
        responsavelNome: "Administração Demo",
        responsavelEmail: "demo@exemplo.com",
        status: "TESTE",
        testeAte: new Date(Date.now() + 30 * 86_400_000),
        planoId: plano?.id,
      },
    });
    const [a, , cc] = await Promise.all(
      (
        [
          ["A", "DIA", 0],
          ["B", "DIA", -1],
          ["C", "NOITE", 0],
          ["D", "NOITE", -1],
        ] as const
      ).map(([nome, turno, d]) => db.equipe.create({ data: { condominioId: c.id, nome, turno, dataReferencia: hojeSP(d) } })),
    );
    await db.local.createMany({
      data: [
        { nome: "Recepção Principal", tipo: "RECEPCAO" as const, ordem: 1 },
        ...Array.from({ length: 20 }, (_, i) => ({ nome: `Andar ${i + 1}`, tipo: "ANDAR" as const, ordem: 101 + i })),
        { nome: "Subsolo 1", tipo: "SUBSOLO" as const, ordem: 401 },
        { nome: "Subsolo 2", tipo: "SUBSOLO" as const, ordem: 402 },
        { nome: "Subsolo 3", tipo: "SUBSOLO" as const, ordem: 403 },
        { nome: "Praça de Alimentação", tipo: "PRACA_ALIMENTACAO" as const, ordem: 500, diasFechado: [0] },
        { nome: "Lojas", tipo: "LOJAS" as const, ordem: 600 },
      ].map((l) => ({ ...l, condominioId: c.id })),
    });
    const senhaHash = await bcrypt.hash("demo1234", 10);
    const pessoas = [
      { nome: "Gestora Demo", login: "demo", papel: "SINDICA" as const },
      { nome: "Carlos", login: "demo.carlos", papel: "ENCARREGADO" as const, equipeId: a.id },
      { nome: "Paulo", login: "demo.paulo", papel: "PORTEIRO" as const, equipeId: a.id },
      { nome: "Marta", login: "demo.marta", papel: "ENCARREGADO" as const, equipeId: cc.id },
      { nome: "Ana", login: "demo.ana", papel: "RECEPCIONISTA" as const, horaInicio: "07:00", horaFim: "13:00", diaFolga: 0 },
      { nome: "Clara", login: "demo.clara", papel: "RECEPCIONISTA" as const, horaInicio: "13:00", horaFim: "19:00", diaFolga: 0 },
      { nome: "Sérgio", login: "demo.sergio", papel: "SUPERVISOR" as const },
    ];
    await db.usuario.createMany({ data: pessoas.map((p) => ({ ...p, senhaHash, condominioId: c.id })) });
    console.log('Condomínio de demonstração criado (login "demo", senha "demo1234").');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

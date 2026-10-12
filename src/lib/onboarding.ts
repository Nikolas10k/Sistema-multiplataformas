import { z } from "zod";
import { Prisma, type TipoLocal } from "@prisma/client";
import { db } from "./db";
import { gerarHashSenha } from "./auth";
import { auditar } from "./auditoria";
import { DIAS_TESTE, slugificar } from "./condominio";
import { ErroOperacao } from "./operacao";
import { FUSOS, HORA_VALIDA, partesLocais, relogioDe, somarDias, dataParaBanco } from "./tempo";
import { documentoValido } from "./cobranca/assinatura";

export const NovoCondominioInput = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome do condomínio").max(80),
    tipo: z.enum(["COMERCIAL", "RESIDENCIAL", "MISTO"]),
    unidades: z.coerce.number().int().min(1).max(20000),
    andares: z.coerce.number().int().min(0).max(200),
    subsolos: z.coerce.number().int().min(0).max(10),
    recepcoes: z.coerce.number().int().min(0).max(20),
    pracaAlimentacao: z.boolean(),
    lojas: z.boolean(),
    fuso: z.string().refine((f) => f in FUSOS, "Fuso inválido"),
    horaInicioDia: z.string().regex(HORA_VALIDA),
    horaInicioNoite: z.string().regex(HORA_VALIDA),
    observacoes: z.string().trim().max(3000).default(""),
    responsavelNome: z.string().trim().min(3, "Informe seu nome"),
    responsavelEmail: z.email("E-mail inválido").transform((e) => e.toLowerCase()),
    responsavelTelefone: z.string().trim().optional(),
    responsavelPapel: z.enum(["SINDICA", "ADMINISTRACAO", "TI_ADMIN", "SUPERVISOR"]),
    cpfCnpj: z
      .string()
      .trim()
      .optional()
      .refine((d) => !d || documentoValido(d), "CPF ou CNPJ inválido"),
    login: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._-]{3,40}$/, "Login: 3 a 40 letras minúsculas, números, ponto, hífen ou sublinhado"),
    senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres"),
    aceite: z.literal(true, "É preciso aceitar os termos de uso"),
  })
  .refine((d) => d.horaInicioDia < d.horaInicioNoite, {
    message: "O turno do dia precisa começar antes do turno da noite",
    path: ["horaInicioNoite"],
  });

export type NovoCondominio = z.infer<typeof NovoCondominioInput>;

/** Texto inicial do perfil do prédio para o agente (a administração pode editar depois). */
export function perfilInicial(d: NovoCondominio): string {
  const unidade = d.tipo === "RESIDENCIAL" ? "apartamentos" : d.tipo === "COMERCIAL" ? "salas comerciais" : "unidades";
  const linhas = [
    `- ${d.unidades} ${unidade}${d.andares ? ` em ${d.andares} andares` : ""}.`,
    d.subsolos ? `- ${d.subsolos} subsolo${d.subsolos > 1 ? "s" : ""} de garagem.` : null,
    d.recepcoes ? `- ${d.recepcoes} recepç${d.recepcoes > 1 ? "ões" : "ão"}/portaria${d.recepcoes > 1 ? "s" : ""} de acesso.` : null,
    d.lojas ? "- Lojas na área externa." : null,
    d.pracaAlimentacao ? "- Praça de alimentação." : null,
    "- Portaria em escala 12x36, com equipes de dia e de noite e um encarregado por equipe.",
    d.observacoes ? `\n${d.observacoes}` : null,
  ];
  return linhas.filter(Boolean).join("\n");
}

function locaisIniciais(d: NovoCondominio): { nome: string; tipo: TipoLocal; ordem: number; diasFechado?: number[] }[] {
  const locais: { nome: string; tipo: TipoLocal; ordem: number; diasFechado?: number[] }[] = [];
  const recepcoes = Math.max(d.recepcoes, 1);
  for (let i = 1; i <= recepcoes; i++)
    locais.push({ nome: recepcoes === 1 ? "Recepção Principal" : `Recepção ${i}`, tipo: "RECEPCAO", ordem: i });
  for (let i = 1; i <= d.andares; i++) locais.push({ nome: `Andar ${i}`, tipo: "ANDAR", ordem: 100 + i });
  for (let i = 1; i <= d.subsolos; i++) locais.push({ nome: `Subsolo ${i}`, tipo: "SUBSOLO", ordem: 400 + i });
  if (d.pracaAlimentacao) locais.push({ nome: "Praça de Alimentação", tipo: "PRACA_ALIMENTACAO", ordem: 500 });
  if (d.lojas) locais.push({ nome: "Lojas", tipo: "LOJAS", ordem: 600 });
  return locais;
}

async function slugDisponivel(base: string): Promise<string> {
  let slug = base;
  for (let i = 2; await db.condominio.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

/** Cria o condomínio em período de teste, com o primeiro gestor, equipes 12x36 e locais. */
export async function criarCondominio(entrada: unknown) {
  const d = NovoCondominioInput.parse(entrada);
  if (await db.usuario.findUnique({ where: { login: d.login }, select: { id: true } })) {
    throw new ErroOperacao("Esse login já está em uso. Escolha outro.");
  }
  const relogio = relogioDe(d);
  const hoje = partesLocais(relogio).dataISO;
  const senhaHash = await gerarHashSenha(d.senha);
  const slug = await slugDisponivel(slugificar(d.nome));
  const planoPadrao = await db.plano.findFirst({ where: { ativo: true }, orderBy: { ordem: "asc" } });

  try {
    const resultado = await db.$transaction(async (tx) => {
      const condominio = await tx.condominio.create({
        data: {
          nome: d.nome,
          slug,
          tipo: d.tipo,
          perfil: perfilInicial(d),
          fuso: d.fuso,
          horaInicioDia: d.horaInicioDia,
          horaInicioNoite: d.horaInicioNoite,
          responsavelNome: d.responsavelNome,
          responsavelEmail: d.responsavelEmail,
          responsavelTelefone: d.responsavelTelefone || null,
          cpfCnpjCobranca: d.cpfCnpj?.replace(/\D/g, "") || null,
          planoId: planoPadrao?.id,
          status: "TESTE",
          testeAte: new Date(Date.now() + DIAS_TESTE * 86_400_000),
        },
      });
      const usuario = await tx.usuario.create({
        data: {
          condominioId: condominio.id,
          nome: d.responsavelNome,
          login: d.login,
          senhaHash,
          papel: d.responsavelPapel,
        },
      });
      const equipes: [string, "DIA" | "NOITE", number][] = [
        ["A", "DIA", 0],
        ["B", "DIA", -1],
        ["C", "NOITE", 0],
        ["D", "NOITE", -1],
      ];
      await tx.equipe.createMany({
        data: equipes.map(([nome, turno, desloc]) => ({
          condominioId: condominio.id,
          nome,
          turno,
          dataReferencia: dataParaBanco(somarDias(hoje, desloc)),
        })),
      });
      await tx.local.createMany({
        data: locaisIniciais(d).map((l) => ({ ...l, diasFechado: l.diasFechado ?? [], condominioId: condominio.id })),
      });
      return { condominio, usuario };
    });
    await auditar("condominio.criado", d.responsavelNome, resultado.condominio.id, { slug, tipo: d.tipo });
    return resultado;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ErroOperacao("Esse login já está em uso. Escolha outro.");
    }
    throw e;
  }
}

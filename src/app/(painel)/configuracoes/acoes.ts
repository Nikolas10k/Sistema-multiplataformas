"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { exigirContexto } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { criptografar } from "@/lib/cripto";
import { db } from "@/lib/db";
import { podeAdministrarSistema } from "@/lib/permissoes";
import { documentoValido } from "@/lib/cobranca/assinatura";
import { FUSOS, HORA_VALIDA } from "@/lib/tempo";
import { contaDoCondominio, testarConta } from "@/lib/whatsapp";

async function exigirGestor() {
  const ctx = await exigirContexto({ permitirBloqueado: true });
  if (!podeAdministrarSistema(ctx.usuario.papel)) redirect("/");
  return ctx;
}

function voltar(tipo: "ok" | "erro", msg: string): never {
  revalidatePath("/configuracoes");
  redirect(`/configuracoes?${tipo}=${encodeURIComponent(msg)}`);
}

export async function salvarCondominio(f: FormData) {
  const ctx = await exigirGestor();
  const nome = String(f.get("nome") ?? "").trim();
  const tipo = String(f.get("tipo"));
  const perfil = String(f.get("perfil") ?? "").trim().slice(0, 8000);
  const fuso = String(f.get("fuso"));
  const horaInicioDia = String(f.get("horaInicioDia"));
  const horaInicioNoite = String(f.get("horaInicioNoite"));
  const cpfCnpj = String(f.get("cpfCnpj") ?? "").replace(/\D/g, "");

  if (nome.length < 3) voltar("erro", "Informe o nome do condomínio.");
  if (!["COMERCIAL", "RESIDENCIAL", "MISTO"].includes(tipo)) voltar("erro", "Tipo inválido.");
  if (!(fuso in FUSOS)) voltar("erro", "Fuso inválido.");
  if (!HORA_VALIDA.test(horaInicioDia) || !HORA_VALIDA.test(horaInicioNoite) || horaInicioDia >= horaInicioNoite) {
    voltar("erro", "Horários inválidos: o turno do dia precisa começar antes do turno da noite.");
  }
  if (cpfCnpj && !documentoValido(cpfCnpj)) voltar("erro", "CPF ou CNPJ inválido.");

  await db.condominio.update({
    where: { id: ctx.condominio.id },
    data: {
      nome,
      tipo: tipo as "COMERCIAL",
      perfil,
      fuso,
      horaInicioDia,
      horaInicioNoite,
      cpfCnpjCobranca: cpfCnpj || null,
    },
  });
  await auditar("condominio.configuracoes", ctx.usuario.nome, ctx.condominio.id, { nome, tipo, fuso, horaInicioDia, horaInicioNoite });
  voltar("ok", "Configurações salvas.");
}

export async function salvarWhatsapp(f: FormData) {
  const ctx = await exigirGestor();
  if (f.get("remover") === "1") {
    await db.condominio.update({
      where: { id: ctx.condominio.id },
      data: { whatsappPhoneNumberId: null, whatsappTokenCripto: null, whatsappNumeroExibicao: null },
    });
    await auditar("whatsapp.desconectado", ctx.usuario.nome, ctx.condominio.id);
    voltar("ok", "WhatsApp desconectado.");
  }
  const phoneNumberId = String(f.get("phoneNumberId") ?? "").trim();
  const token = String(f.get("token") ?? "").trim();
  if (!/^\d{6,30}$/.test(phoneNumberId)) voltar("erro", "O Phone Number ID tem só números (veja no painel da Meta).");

  const tokenCripto = token ? criptografar(token) : ctx.condominio.whatsappTokenCripto;
  const conta = contaDoCondominio({ whatsappPhoneNumberId: phoneNumberId, whatsappTokenCripto: tokenCripto });
  if (!conta) voltar("erro", "Informe o token de acesso do número (ou peça à plataforma para usar o token padrão).");
  const teste = await testarConta(conta);
  if (!teste.ok) voltar("erro", `A Meta recusou a configuração: ${teste.erro}`);

  try {
    await db.condominio.update({
      where: { id: ctx.condominio.id },
      data: { whatsappPhoneNumberId: phoneNumberId, whatsappTokenCripto: tokenCripto, whatsappNumeroExibicao: teste.numero ?? null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      voltar("erro", "Esse número já está ligado a outro condomínio.");
    }
    throw e;
  }
  await auditar("whatsapp.conectado", ctx.usuario.nome, ctx.condominio.id, { numero: teste.numero });
  voltar("ok", `WhatsApp conectado: ${teste.numero ?? phoneNumberId}.`);
}

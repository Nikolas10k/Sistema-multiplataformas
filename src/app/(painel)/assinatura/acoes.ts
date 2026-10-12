"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirContexto } from "@/lib/auth";
import { db } from "@/lib/db";
import { podeAdministrarSistema } from "@/lib/permissoes";
import { assinarPlano, documentoValido, sincronizarFaturas } from "@/lib/cobranca/assinatura";
import { ErroAsaas, type FormaPagamento } from "@/lib/cobranca/asaas";

const FORMAS: FormaPagamento[] = ["UNDEFINED", "BOLETO", "PIX", "CREDIT_CARD"];

export async function contratarPlano(f: FormData) {
  const ctx = await exigirContexto({ permitirBloqueado: true });
  if (!podeAdministrarSistema(ctx.usuario.papel)) redirect("/");
  const planoId = String(f.get("planoId"));
  const forma = String(f.get("forma")) as FormaPagamento;
  const cpfCnpj = String(f.get("cpfCnpj") ?? "").replace(/\D/g, "");

  let destino = "/assinatura?ok=" + encodeURIComponent("Assinatura atualizada. A fatura aparece abaixo.");
  try {
    if (!FORMAS.includes(forma)) throw new ErroAsaas("Forma de pagamento inválida.", 400);
    if (cpfCnpj) {
      if (!documentoValido(cpfCnpj)) throw new ErroAsaas("CPF ou CNPJ inválido.", 400);
      await db.condominio.update({ where: { id: ctx.condominio.id }, data: { cpfCnpjCobranca: cpfCnpj } });
    }
    await assinarPlano(ctx.condominio.id, planoId, forma, ctx.usuario.nome);
  } catch (e) {
    if (!(e instanceof ErroAsaas)) throw e;
    destino = "/assinatura?erro=" + encodeURIComponent(e.message);
  }
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function atualizarFaturas() {
  const ctx = await exigirContexto({ permitirBloqueado: true });
  await sincronizarFaturas(ctx.condominio).catch((e) => console.error("[asaas] sincronização manual", e));
  revalidatePath("/", "layout");
  redirect("/assinatura");
}

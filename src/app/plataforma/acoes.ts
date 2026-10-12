"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type StatusCondominio } from "@prisma/client";
import {
  criarSessao,
  encerrarSessao,
  exigirAdmin,
  limparFalhasLogin,
  loginBloqueado,
  registrarFalhaLogin,
  verificarAdmin,
} from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { db } from "@/lib/db";
import { sincronizarFaturas } from "@/lib/cobranca/assinatura";
import { cancelarAssinatura } from "@/lib/cobranca/asaas";

export async function entrarAdmin(_e: { erro: string; email: string }, f: FormData) {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const chave = `admin:${email}`;
  if (await loginBloqueado(chave)) return { erro: "Muitas tentativas. Aguarde 15 minutos.", email };
  const admin = await verificarAdmin(email, String(f.get("senha") ?? ""));
  if (!admin) {
    await registrarFalhaLogin(chave);
    return { erro: "E-mail ou senha incorretos.", email };
  }
  await limparFalhasLogin(chave);
  await criarSessao("admin", admin.id);
  await auditar("plataforma.login", admin.nome);
  redirect("/plataforma");
}

export async function sairAdmin() {
  await encerrarSessao();
  redirect("/plataforma/login");
}

function voltar(caminho: string, tipo: "ok" | "erro", msg: string): never {
  revalidatePath(caminho);
  redirect(`${caminho}?${tipo}=${encodeURIComponent(msg)}`);
}

const STATUS: StatusCondominio[] = ["TESTE", "ATIVO", "INADIMPLENTE", "SUSPENSO", "CANCELADO"];

export async function alterarCondominio(f: FormData) {
  const admin = await exigirAdmin();
  const id = String(f.get("id"));
  const caminho = `/plataforma/condominios/${id}`;
  const c = await db.condominio.findUnique({ where: { id } });
  if (!c) redirect("/plataforma");

  const status = String(f.get("status")) as StatusCondominio;
  const planoId = String(f.get("planoId") ?? "") || null;
  const diasTeste = Number(f.get("diasTeste") ?? 0);
  if (!STATUS.includes(status)) voltar(caminho, "erro", "Status inválido.");

  const data: Prisma.CondominioUpdateInput = {
    status,
    plano: planoId ? { connect: { id: planoId } } : { disconnect: true },
  };
  if (status === "ATIVO") data.inadimplenteDesde = null;
  if (status === "INADIMPLENTE" && !c.inadimplenteDesde) data.inadimplenteDesde = new Date();
  if (diasTeste > 0) {
    const base = c.testeAte && c.testeAte > new Date() ? c.testeAte : new Date();
    data.testeAte = new Date(base.getTime() + diasTeste * 86_400_000);
  }
  await db.condominio.update({ where: { id }, data });
  await auditar("plataforma.condominio_alterado", admin.nome, id, { status, planoId, diasTeste });
  voltar(caminho, "ok", "Condomínio atualizado.");
}

export async function cancelarCondominio(f: FormData) {
  const admin = await exigirAdmin();
  const id = String(f.get("id"));
  const caminho = `/plataforma/condominios/${id}`;
  const c = await db.condominio.findUnique({ where: { id } });
  if (!c) redirect("/plataforma");
  if (c.asaasSubscriptionId) {
    try {
      await cancelarAssinatura(c.asaasSubscriptionId);
    } catch (e) {
      voltar(caminho, "erro", `Não foi possível cancelar no Asaas: ${e instanceof Error ? e.message : e}`);
    }
  }
  await db.condominio.update({ where: { id }, data: { status: "CANCELADO", asaasSubscriptionId: null } });
  await auditar("plataforma.condominio_cancelado", admin.nome, id);
  voltar(caminho, "ok", "Assinatura cancelada e acesso encerrado.");
}

export async function sincronizarCondominio(f: FormData) {
  await exigirAdmin();
  const id = String(f.get("id"));
  const c = await db.condominio.findUnique({ where: { id } });
  if (c) await sincronizarFaturas(c).catch((e) => console.error("[asaas] sincronização", e));
  voltar(`/plataforma/condominios/${id}`, "ok", "Faturas sincronizadas.");
}

export async function salvarPlano(f: FormData) {
  const admin = await exigirAdmin();
  const id = String(f.get("id") ?? "") || null;
  const nome = String(f.get("nome") ?? "").trim();
  const preco = Number(String(f.get("precoMensal") ?? "").replace(",", "."));
  const num = (k: string) => {
    const v = String(f.get(k) ?? "").trim();
    return v ? Math.max(1, Math.floor(Number(v))) : null;
  };
  if (!nome || !(preco >= 0)) voltar("/plataforma/planos", "erro", "Informe nome e preço.");
  const data = {
    nome,
    descricao: String(f.get("descricao") ?? "").trim(),
    precoMensal: new Prisma.Decimal(preco.toFixed(2)),
    maxUsuarios: num("maxUsuarios"),
    maxMensagensMes: num("maxMensagensMes"),
    ordem: Number(f.get("ordem") ?? 0),
    ativo: f.get("ativo") === "on",
  };
  try {
    if (id) await db.plano.update({ where: { id }, data });
    else await db.plano.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") voltar("/plataforma/planos", "erro", "Já existe plano com esse nome.");
    throw e;
  }
  await auditar("plataforma.plano_salvo", admin.nome, null, { nome, preco });
  voltar("/plataforma/planos", "ok", "Plano salvo. Assinaturas existentes mantêm o valor até o condomínio trocar de plano.");
}

import { Prisma, type Condominio } from "@prisma/client";
import { db } from "../db";
import { auditar } from "../auditoria";
import { DIAS_CARENCIA, NOME_PRODUTO } from "../condominio";
import { partesLocais, relogioDe, somarDias } from "../tempo";
import {
  atualizarAssinatura,
  cobrancasDaAssinatura,
  criarAssinatura,
  criarCliente,
  ErroAsaas,
  type CobrancaAsaas,
  type FormaPagamento,
} from "./asaas";

const PAGAS = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

export function documentoValido(doc: string): boolean {
  const d = doc.replace(/\D/g, "");
  return d.length === 11 || d.length === 14;
}

/**
 * Contrata (ou troca) o plano do condomínio no Asaas.
 * Durante o teste, a primeira cobrança vence no fim do teste; depois disso, vence amanhã.
 * O condomínio fica ATIVO na hora; se a fatura vencer sem pagamento, entra em INADIMPLENTE.
 */
export async function assinarPlano(condominioId: string, planoId: string, forma: FormaPagamento, autor: string) {
  const [condominio, plano] = await Promise.all([
    db.condominio.findUniqueOrThrow({ where: { id: condominioId } }),
    db.plano.findFirst({ where: { id: planoId, ativo: true } }),
  ]);
  if (!plano) throw new ErroAsaas("Plano indisponível.", 400);
  if (!condominio.cpfCnpjCobranca || !documentoValido(condominio.cpfCnpjCobranca)) {
    throw new ErroAsaas("Informe um CPF ou CNPJ válido para a cobrança.", 400);
  }

  let clienteId = condominio.asaasCustomerId;
  if (!clienteId) {
    clienteId = (
      await criarCliente({
        nome: condominio.nome,
        cpfCnpj: condominio.cpfCnpjCobranca.replace(/\D/g, ""),
        email: condominio.responsavelEmail,
        telefone: condominio.responsavelTelefone,
        referencia: condominio.id,
      })
    ).id;
    await db.condominio.update({ where: { id: condominio.id }, data: { asaasCustomerId: clienteId } });
  }

  const valor = Number(plano.precoMensal);
  const descricao = `${NOME_PRODUTO} · plano ${plano.nome}`;
  let assinaturaId = condominio.asaasSubscriptionId;
  if (assinaturaId) {
    await atualizarAssinatura(assinaturaId, { valor, forma, descricao });
  } else {
    const hoje = partesLocais(relogioDe(condominio)).dataISO;
    const fimTeste = condominio.testeAte ? partesLocais(relogioDe(condominio), condominio.testeAte).dataISO : null;
    const vencimento = fimTeste && fimTeste > hoje ? fimTeste : somarDias(hoje, 1);
    assinaturaId = (
      await criarAssinatura({ cliente: clienteId, valor, forma, primeiroVencimento: vencimento, descricao, referencia: condominio.id })
    ).id;
  }

  const atualizado = await db.condominio.update({
    where: { id: condominio.id },
    data: {
      planoId: plano.id,
      asaasSubscriptionId: assinaturaId,
      ...(condominio.status === "TESTE" || condominio.status === "SUSPENSO" ? { status: "ATIVO" as const } : {}),
    },
  });
  await auditar("assinatura.contratada", autor, condominio.id, { plano: plano.nome, valor, forma });
  await sincronizarFaturas(atualizado).catch((e) => console.error("[asaas] sincronização falhou", e));
  return atualizado;
}

/** Busca as cobranças da assinatura no Asaas e atualiza faturas e status. */
export async function sincronizarFaturas(condominio: Condominio) {
  if (!condominio.asaasSubscriptionId) return;
  for (const c of await cobrancasDaAssinatura(condominio.asaasSubscriptionId)) {
    await aplicarCobranca(condominio.id, c);
  }
}

/** Atualiza a fatura e o status do condomínio a partir de uma cobrança do Asaas. */
export async function aplicarCobranca(condominioId: string, c: CobrancaAsaas) {
  const paga = PAGAS.has(c.status);
  await db.fatura.upsert({
    where: { asaasPaymentId: c.id },
    create: {
      condominioId,
      asaasPaymentId: c.id,
      valor: new Prisma.Decimal(c.value),
      vencimento: new Date(`${c.dueDate}T00:00:00Z`),
      status: c.status,
      linkFatura: c.invoiceUrl ?? null,
      pagaEm: paga ? new Date() : null,
    },
    update: {
      valor: new Prisma.Decimal(c.value),
      vencimento: new Date(`${c.dueDate}T00:00:00Z`),
      status: c.status,
      linkFatura: c.invoiceUrl ?? undefined,
      ...(paga ? { pagaEm: new Date() } : {}),
    },
  });

  const condominio = await db.condominio.findUniqueOrThrow({ where: { id: condominioId } });
  if (condominio.status === "CANCELADO") return;

  if (paga) {
    const vencidas = await db.fatura.count({ where: { condominioId, status: "OVERDUE" } });
    if (vencidas === 0 && condominio.status !== "ATIVO") {
      await db.condominio.update({ where: { id: condominioId }, data: { status: "ATIVO", inadimplenteDesde: null } });
      await auditar("assinatura.reativada_por_pagamento", "Asaas", condominioId, { cobranca: c.id });
    }
  } else if (c.status === "OVERDUE" && (condominio.status === "ATIVO" || condominio.status === "TESTE")) {
    await db.condominio.update({
      where: { id: condominioId },
      data: { status: "INADIMPLENTE", inadimplenteDesde: condominio.inadimplenteDesde ?? new Date() },
    });
    await auditar("assinatura.inadimplente", "Asaas", condominioId, { cobranca: c.id, vencimento: c.dueDate });
  }
}

type EventoAsaas = { id?: string; event?: string; payment?: CobrancaAsaas };

/** Processa um evento de webhook do Asaas (idempotente). */
export async function processarEventoAsaas(evento: EventoAsaas): Promise<"ok" | "duplicado" | "ignorado"> {
  if (!evento.payment || !evento.event?.startsWith("PAYMENT_")) return "ignorado";
  if (evento.id) {
    try {
      await db.asaasEventoProcessado.create({ data: { id: evento.id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "duplicado";
      throw e;
    }
  }
  const p = evento.payment;
  const condominio = await db.condominio.findFirst({
    where: {
      OR: [
        ...(p.subscription ? [{ asaasSubscriptionId: p.subscription }] : []),
        { asaasCustomerId: p.customer },
        ...(p.externalReference ? [{ id: p.externalReference }] : []),
      ],
    },
  });
  if (!condominio) return "ignorado";
  if (evento.event === "PAYMENT_DELETED") {
    await db.fatura.deleteMany({ where: { asaasPaymentId: p.id, condominioId: condominio.id } });
    return "ok";
  }
  await aplicarCobranca(condominio.id, p);
  return "ok";
}

/** Rotina diária: suspende quem passou da carência ou do teste. */
export async function aplicarSuspensoes(agora = new Date()) {
  const limite = new Date(agora.getTime() - DIAS_CARENCIA * 86_400_000);
  const inadimplentes = await db.condominio.findMany({
    where: { status: "INADIMPLENTE", inadimplenteDesde: { lt: limite } },
    select: { id: true },
  });
  const testesVencidos = await db.condominio.findMany({
    where: { status: "TESTE", testeAte: { lt: agora } },
    select: { id: true },
  });
  for (const { id } of inadimplentes) {
    await db.condominio.update({ where: { id }, data: { status: "SUSPENSO" } });
    await auditar("assinatura.suspensa_inadimplencia", "sistema", id);
  }
  for (const { id } of testesVencidos) {
    await db.condominio.update({ where: { id }, data: { status: "SUSPENSO" } });
    await auditar("assinatura.suspensa_fim_teste", "sistema", id);
  }
}

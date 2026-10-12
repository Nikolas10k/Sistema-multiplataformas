import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { criarCondominio } from "@/lib/onboarding";
import { aplicarSuspensoes, processarEventoAsaas } from "@/lib/cobranca/assinatura";
import { ErroOperacao } from "@/lib/operacao";
import { novoCondominio, sufixo } from "./ajuda";

function dadosCadastro(s: string) {
  return {
    nome: `Centro Empresarial ${s}`,
    tipo: "COMERCIAL",
    unidades: "800",
    andares: "20",
    subsolos: "3",
    recepcoes: "2",
    pracaAlimentacao: true,
    lojas: true,
    fuso: "America/Sao_Paulo",
    horaInicioDia: "07:00",
    horaInicioNoite: "19:00",
    observacoes: "Praça fecha aos domingos.",
    responsavelNome: "Fulana",
    responsavelEmail: `Fulana${s}@Exemplo.com`,
    responsavelPapel: "SINDICA",
    login: `fulana${s}`,
    senha: "senha-forte-1",
    aceite: true,
  };
}

describe("cadastro de condomínio", () => {
  it("cria condomínio em teste com gestor, 4 equipes, locais e perfil", async () => {
    const s = sufixo();
    const { condominio, usuario } = await criarCondominio(dadosCadastro(s));
    expect(condominio.status).toBe("TESTE");
    expect(condominio.testeAte!.getTime()).toBeGreaterThan(Date.now());
    expect(condominio.responsavelEmail).toBe(`fulana${s}@exemplo.com`);
    expect(condominio.perfil).toContain("800 salas comerciais");
    expect(usuario.papel).toBe("SINDICA");
    expect(await db.equipe.count({ where: { condominioId: condominio.id } })).toBe(4);
    // 2 recepções + 20 andares + 3 subsolos + praça + lojas
    expect(await db.local.count({ where: { condominioId: condominio.id } })).toBe(27);
  });

  it("recusa login repetido e dados inválidos", async () => {
    const s = sufixo();
    await criarCondominio(dadosCadastro(s));
    await expect(criarCondominio({ ...dadosCadastro(sufixo()), login: `fulana${s}` })).rejects.toBeInstanceOf(ErroOperacao);
    await expect(criarCondominio({ ...dadosCadastro(sufixo()), aceite: false })).rejects.toThrow();
    await expect(criarCondominio({ ...dadosCadastro(sufixo()), horaInicioDia: "20:00" })).rejects.toThrow();
  });

  it("gera slugs únicos para nomes iguais", async () => {
    const s = sufixo();
    const d1 = { ...dadosCadastro(s), nome: `Edifício Igual ${s}` };
    const a = await criarCondominio(d1);
    const b = await criarCondominio({ ...d1, login: `outro${s}`, responsavelEmail: `o${s}@x.com` });
    expect(a.condominio.slug).not.toBe(b.condominio.slug);
  });
});

describe("cobrança (webhook do Asaas)", () => {
  const cobranca = (c: { asaasCustomerId: string; asaasSubscriptionId: string }, id: string, status: string) => ({
    id,
    customer: c.asaasCustomerId,
    subscription: c.asaasSubscriptionId,
    value: 397,
    status,
    dueDate: "2026-11-01",
    invoiceUrl: "https://www.asaas.com/i/123",
  });

  it("vencida → inadimplente; paga → ativo; eventos repetidos são ignorados", async () => {
    const s = sufixo();
    const ctx = await novoCondominio("SINDICA", { asaasCustomerId: `cus_${s}`, asaasSubscriptionId: `sub_${s}` });
    const ids = { asaasCustomerId: `cus_${s}`, asaasSubscriptionId: `sub_${s}` };

    expect(await processarEventoAsaas({ id: `evt1_${s}`, event: "PAYMENT_OVERDUE", payment: cobranca(ids, `pay_${s}`, "OVERDUE") })).toBe("ok");
    let c = await db.condominio.findUniqueOrThrow({ where: { id: ctx.condominio.id } });
    expect(c.status).toBe("INADIMPLENTE");
    expect(c.inadimplenteDesde).not.toBeNull();

    expect(await processarEventoAsaas({ id: `evt1_${s}`, event: "PAYMENT_OVERDUE", payment: cobranca(ids, `pay_${s}`, "OVERDUE") })).toBe("duplicado");

    await processarEventoAsaas({ id: `evt2_${s}`, event: "PAYMENT_RECEIVED", payment: cobranca(ids, `pay_${s}`, "RECEIVED") });
    c = await db.condominio.findUniqueOrThrow({ where: { id: ctx.condominio.id } });
    expect(c.status).toBe("ATIVO");
    expect(c.inadimplenteDesde).toBeNull();
    const fatura = await db.fatura.findUniqueOrThrow({ where: { asaasPaymentId: `pay_${s}` } });
    expect(fatura.status).toBe("RECEIVED");
    expect(fatura.pagaEm).not.toBeNull();
    expect(fatura.valor).toEqual(new Prisma.Decimal(397));
  });

  it("ignora eventos de clientes desconhecidos", async () => {
    const s = sufixo();
    expect(
      await processarEventoAsaas({ id: `evt_${s}`, event: "PAYMENT_RECEIVED", payment: cobranca({ asaasCustomerId: "cus_x", asaasSubscriptionId: "sub_x" }, `p_${s}`, "RECEIVED") }),
    ).toBe("ignorado");
  });

  it("suspende inadimplentes além da carência e testes vencidos", async () => {
    const dia = 86_400_000;
    const atrasado = await novoCondominio("SINDICA", { status: "INADIMPLENTE", inadimplenteDesde: new Date(Date.now() - 10 * dia) });
    const recente = await novoCondominio("SINDICA", { status: "INADIMPLENTE", inadimplenteDesde: new Date(Date.now() - 2 * dia) });
    const teste = await novoCondominio("SINDICA", { status: "TESTE", testeAte: new Date(Date.now() - dia) });
    await aplicarSuspensoes();
    const status = async (id: string) => (await db.condominio.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(atrasado.condominio.id)).toBe("SUSPENSO");
    expect(await status(recente.condominio.id)).toBe("INADIMPLENTE");
    expect(await status(teste.condominio.id)).toBe("SUSPENSO");
  });
});

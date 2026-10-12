import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { db } from "@/lib/db";
import { assinarPlano } from "@/lib/cobranca/assinatura";
import { novoCondominio, sufixo } from "./ajuda";

// Asaas simulado: registra as chamadas e devolve respostas no formato da API v3.
const chamadas: { metodo: string; caminho: string; corpo: Record<string, unknown>; chave?: string }[] = [];
let servidor: http.Server;

beforeAll(async () => {
  servidor = http.createServer((req, res) => {
    let corpo = "";
    req.on("data", (c) => (corpo += c));
    req.on("end", () => {
      const json = corpo ? JSON.parse(corpo) : {};
      chamadas.push({ metodo: req.method!, caminho: req.url!, corpo: json, chave: req.headers["access_token"] as string });
      res.setHeader("content-type", "application/json");
      if (req.url === "/customers") return res.end(JSON.stringify({ id: `cus_${sufixo()}` }));
      if (req.url === "/subscriptions") return res.end(JSON.stringify({ id: `sub_${sufixo()}` }));
      if (req.url?.startsWith("/subscriptions/") && req.url.endsWith("/payments?limit=24")) {
        return res.end(
          JSON.stringify({
            data: [{ id: `pay_${sufixo()}`, customer: "c", value: json.value ?? 397, status: "PENDING", dueDate: "2026-10-26", invoiceUrl: "https://asaas/i/1" }],
          }),
        );
      }
      if (req.url?.startsWith("/subscriptions/")) return res.end(JSON.stringify({ id: req.url.split("/")[2] }));
      res.statusCode = 404;
      res.end(JSON.stringify({ errors: [{ description: "não encontrado" }] }));
    });
  });
  await new Promise<void>((r) => servidor.listen(0, r));
  process.env.ASAAS_URL_BASE = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  process.env.ASAAS_API_KEY = "chave-teste";
});

afterAll(() => {
  servidor.close();
  delete process.env.ASAAS_URL_BASE;
  delete process.env.ASAAS_API_KEY;
});

describe("contratação de plano no Asaas", () => {
  it("cria cliente e assinatura, ativa o condomínio e registra a fatura", async () => {
    const plano = await db.plano.create({ data: { nome: `Plano ${sufixo()}`, precoMensal: "397.00", maxUsuarios: 10 } });
    const fimTeste = new Date(Date.now() + 5 * 86_400_000);
    const ctx = await novoCondominio("SINDICA", { status: "TESTE", testeAte: fimTeste, cpfCnpjCobranca: "12345678000190" });
    chamadas.length = 0;

    const c = await assinarPlano(ctx.condominio.id, plano.id, "PIX", "teste");
    expect(c.status).toBe("ATIVO");
    expect(c.planoId).toBe(plano.id);
    expect(c.asaasCustomerId).toMatch(/^cus_/);
    expect(c.asaasSubscriptionId).toMatch(/^sub_/);

    const assinatura = chamadas.find((x) => x.caminho === "/subscriptions")!;
    expect(assinatura.chave).toBe("chave-teste");
    expect(assinatura.corpo).toMatchObject({ billingType: "PIX", value: 397, cycle: "MONTHLY", externalReference: ctx.condominio.id });
    // durante o teste, a primeira cobrança vence no fim do teste
    expect(assinatura.corpo.nextDueDate).toBe(new Date(fimTeste.getTime() - 3 * 3600_000).toISOString().slice(0, 10));
    expect(await db.fatura.count({ where: { condominioId: ctx.condominio.id } })).toBe(1);

    // trocar de plano atualiza a assinatura existente, sem criar outra
    const outro = await db.plano.create({ data: { nome: `Plano ${sufixo()}`, precoMensal: "797.00" } });
    chamadas.length = 0;
    await assinarPlano(ctx.condominio.id, outro.id, "BOLETO", "teste");
    expect(chamadas.some((x) => x.caminho === "/subscriptions")).toBe(false);
    expect(chamadas.find((x) => x.caminho === `/subscriptions/${c.asaasSubscriptionId}`)?.corpo).toMatchObject({
      value: 797,
      billingType: "BOLETO",
      updatePendingPayments: true,
    });
  });

  it("exige CPF/CNPJ válido", async () => {
    const plano = await db.plano.create({ data: { nome: `Plano ${sufixo()}`, precoMensal: "100.00" } });
    const ctx = await novoCondominio("SINDICA", { cpfCnpjCobranca: null });
    await expect(assinarPlano(ctx.condominio.id, plano.id, "PIX", "teste")).rejects.toThrow(/CPF ou CNPJ/);
  });
});

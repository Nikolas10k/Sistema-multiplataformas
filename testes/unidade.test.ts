import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { plantaoEm, relogioDe, ultimoDiaEncerrado, somarMinutos, diaOperacional, partesLocais } from "@/lib/tempo";
import { situacaoAcesso, slugificar } from "@/lib/condominio";
import { equipeTrabalhaNoPlantao } from "@/lib/escala";
import { assinaturaValida, normalizarTelefone, variantesTelefone } from "@/lib/whatsapp";
import { criptografar, descriptografar } from "@/lib/cripto";
import { documentoValido } from "@/lib/cobranca/assinatura";

const sp = relogioDe({ fuso: "America/Sao_Paulo", horaInicioDia: "07:00", horaInicioNoite: "19:00" });

describe("turnos", () => {
  it("identifica o plantão nos limites de troca", () => {
    expect(plantaoEm(sp, new Date("2026-10-12T09:59:00Z")).chave).toBe("2026-10-11:NOITE"); // 06:59 SP
    expect(plantaoEm(sp, new Date("2026-10-12T10:00:00Z")).chave).toBe("2026-10-12:DIA"); // 07:00 SP
    expect(plantaoEm(sp, new Date("2026-10-12T21:59:00Z")).chave).toBe("2026-10-12:DIA"); // 18:59 SP
    expect(plantaoEm(sp, new Date("2026-10-12T22:00:00Z")).chave).toBe("2026-10-12:NOITE"); // 19:00 SP
    expect(plantaoEm(sp, new Date("2026-10-13T02:30:00Z")).chave).toBe("2026-10-12:NOITE"); // 23:30 SP
  });

  it("respeita horários e fuso de cada condomínio", () => {
    const manaus = relogioDe({ fuso: "America/Manaus", horaInicioDia: "06:00", horaInicioNoite: "18:00" });
    // 10:30Z = 06:30 em Manaus
    const p = plantaoEm(manaus, new Date("2026-10-12T10:30:00Z"));
    expect(p.chave).toBe("2026-10-12:DIA");
    expect(p.inicio.toISOString()).toBe("2026-10-12T10:00:00.000Z");
    expect(p.fim.toISOString()).toBe("2026-10-12T22:00:00.000Z");
    expect(partesLocais(manaus, new Date("2026-10-12T03:00:00Z")).dataISO).toBe("2026-10-11");
  });

  it("calcula o último dia operacional encerrado", () => {
    expect(ultimoDiaEncerrado(sp, new Date("2026-10-12T12:00:00Z"))).toBe("2026-10-11"); // 09h
    expect(ultimoDiaEncerrado(sp, new Date("2026-10-12T08:00:00Z"))).toBe("2026-10-10"); // 05h, dia 11 ainda aberto
    const d = diaOperacional(sp, "2026-10-11");
    expect(d.inicio.toISOString()).toBe("2026-10-11T10:00:00.000Z");
    expect(d.fim.toISOString()).toBe("2026-10-12T10:00:00.000Z");
  });

  it("soma minutos em HH:MM com virada de dia", () => {
    expect(somarMinutos("07:00", 10)).toBe("07:10");
    expect(somarMinutos("23:55", 10)).toBe("00:05");
  });
});

describe("escala 12x36", () => {
  it("alterna os dias de cada equipe", () => {
    const equipe = { turno: "DIA" as const, dataReferencia: new Date("2026-10-10T00:00:00Z") };
    const p = (data: string) => ({ ...plantaoEm(sp, new Date(`${data}T15:00:00Z`)) });
    expect(equipeTrabalhaNoPlantao(equipe, p("2026-10-10"))).toBe(true);
    expect(equipeTrabalhaNoPlantao(equipe, p("2026-10-11"))).toBe(false);
    expect(equipeTrabalhaNoPlantao(equipe, p("2026-10-12"))).toBe(true);
    expect(equipeTrabalhaNoPlantao(equipe, p("2026-10-08"))).toBe(true);
  });
});

describe("acesso por assinatura", () => {
  const agora = new Date("2026-10-12T12:00:00Z");
  const dia = 86_400_000;
  it("libera teste em vigor e bloqueia teste vencido", () => {
    expect(situacaoAcesso({ status: "TESTE", testeAte: new Date(agora.getTime() + dia), inadimplenteDesde: null }, agora).liberado).toBe(true);
    expect(situacaoAcesso({ status: "TESTE", testeAte: new Date(agora.getTime() - 1), inadimplenteDesde: null }, agora)).toMatchObject({
      liberado: false,
      motivo: "TESTE_EXPIRADO",
    });
  });
  it("dá carência para inadimplente e depois bloqueia", () => {
    expect(situacaoAcesso({ status: "INADIMPLENTE", testeAte: null, inadimplenteDesde: new Date(agora.getTime() - 2 * dia) }, agora).liberado).toBe(true);
    expect(situacaoAcesso({ status: "INADIMPLENTE", testeAte: null, inadimplenteDesde: new Date(agora.getTime() - 8 * dia) }, agora).liberado).toBe(false);
  });
  it("bloqueia suspenso e cancelado", () => {
    expect(situacaoAcesso({ status: "SUSPENSO", testeAte: null, inadimplenteDesde: null }).liberado).toBe(false);
    expect(situacaoAcesso({ status: "CANCELADO", testeAte: null, inadimplenteDesde: null }).liberado).toBe(false);
  });
});

describe("utilidades", () => {
  it("normaliza telefones brasileiros e o nono dígito", () => {
    expect(normalizarTelefone("(11) 99999-8888")).toBe("5511999998888");
    expect(variantesTelefone("551199998888")).toEqual(["551199998888", "5511999998888"]);
    expect(variantesTelefone("5511999998888")).toEqual(["5511999998888", "551199998888"]);
  });
  it("valida a assinatura do webhook da Meta", () => {
    const corpo = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "segredo-app").update(corpo).digest("hex");
    expect(assinaturaValida(corpo, sig)).toBe(true);
    expect(assinaturaValida(corpo + " ", sig)).toBe(false);
    expect(assinaturaValida(corpo, null)).toBe(false);
  });
  it("criptografa e descriptografa tokens", () => {
    const c = criptografar("token-secreto");
    expect(c).not.toContain("token-secreto");
    expect(descriptografar(c)).toBe("token-secreto");
    expect(() => descriptografar(c.slice(0, -4) + "AAAA")).toThrow();
  });
  it("valida CPF/CNPJ por tamanho e gera slugs", () => {
    expect(documentoValido("123.456.789-09")).toBe(true);
    expect(documentoValido("12.345.678/0001-90")).toBe(true);
    expect(documentoValido("123")).toBe(false);
    expect(slugificar("Edifício São João  II")).toBe("edificio-sao-joao-ii");
  });
});

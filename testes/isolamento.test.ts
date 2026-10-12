import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  atualizarOcorrencia,
  buscarAcessos,
  dadosDoPeriodo,
  listarOcorrencias,
  registrarAcesso,
  registrarOcorrencia,
  registrarRonda,
  registrarSaida,
  resolverLocal,
  situacaoRondas,
} from "@/lib/operacao";
import { executarFerramenta } from "@/lib/agente/ferramentas";
import { novoCondominio } from "./ajuda";

const ocorrencia = { titulo: "Lâmpada queimada", descricao: "Corredor B", categoria: "MANUTENCAO", setor: "ADMINISTRACAO" } as const;

describe("isolamento entre condomínios", () => {
  it("numera ocorrências de forma independente e sem colisão em registros simultâneos", async () => {
    const a = await novoCondominio();
    const b = await novoCondominio();
    const emA = await Promise.all(Array.from({ length: 5 }, () => registrarOcorrencia(a, ocorrencia, "WEB")));
    const emB = await registrarOcorrencia(b, ocorrencia, "WEB");
    expect(emA.map((o) => o.numero).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(emB.numero).toBe(1);
  });

  it("um condomínio não altera nem lista ocorrências de outro", async () => {
    const a = await novoCondominio("ENCARREGADO");
    const b = await novoCondominio("ENCARREGADO");
    await registrarOcorrencia(a, ocorrencia, "WEB");
    // B ainda não tem a ocorrência #1: tentar resolvê-la não pode afetar a de A
    await expect(atualizarOcorrencia(b, { numero: 1, status: "RESOLVIDA", resolucao: "x" })).rejects.toThrow(/não existe/);
    const deA = await db.ocorrencia.findFirstOrThrow({ where: { condominioId: a.condominio.id } });
    expect(deA.status).toBe("ABERTA");
    expect(await listarOcorrencias(b.condominio.id, {})).toHaveLength(0);
  });

  it("locais, rondas e acessos ficam restritos ao próprio condomínio", async () => {
    const a = await novoCondominio();
    const b = await novoCondominio();
    await db.local.create({ data: { condominioId: a.condominio.id, nome: "Cobertura Exclusiva", tipo: "OUTRO" } });
    expect((await resolverLocal(b.condominio.id, "Cobertura Exclusiva")).local).toBeUndefined();
    await expect(registrarRonda(b, { local: "Cobertura Exclusiva" }, "WEB")).rejects.toThrow(/não encontrado/);

    await registrarRonda(a, { local: "5º andar" }, "WEB");
    const rondasB = await situacaoRondas(b.condominio.id, b.relogio);
    expect(rondasB.every((s) => s.quantidade === 0)).toBe(true);

    const visita = await registrarAcesso(a, { nome: "Maria Visitante" }, "WEB");
    expect(await buscarAcessos(b.condominio.id, { termo: "Maria Visitante" })).toHaveLength(0);
    await expect(registrarSaida(b.condominio.id, visita.id)).rejects.toThrow(/não encontrado/);
    const periodo = await dadosDoPeriodo(b.condominio.id, new Date(0), new Date(Date.now() + 60_000));
    expect(periodo.acessos).toHaveLength(0);
    expect(periodo.rondas).toHaveLength(0);
  });

  it("ferramentas do agente operam no condomínio de quem fala", async () => {
    const a = await novoCondominio();
    const b = await novoCondominio();
    const r = await executarFerramenta("registrar_ronda", { local: "subsolo 2" }, { ctx: b, canal: "WHATSAPP" });
    expect(r.erro).toBe(false);
    expect(await db.ronda.count({ where: { condominioId: a.condominio.id } })).toBe(0);
    expect(await db.ronda.count({ where: { condominioId: b.condominio.id } })).toBe(1);

    const invalida = await executarFerramenta("registrar_ocorrencia", { titulo: "x" }, { ctx: b, canal: "WEB" });
    expect(invalida.erro).toBe(true);
    const livro = await executarFerramenta("livro_do_dia", {}, { ctx: b, canal: "WEB" });
    expect(livro).toMatchObject({ erro: true });
  });

  it("guarda só os 4 últimos dígitos do documento e rejeita fotos com nome inválido", async () => {
    const a = await novoCondominio();
    await expect(registrarAcesso(a, { nome: "João", documento_final: "123456" }, "WEB")).rejects.toThrow();
    await expect(registrarOcorrencia(a, { ...ocorrencia, fotos: ["../../etc/passwd"] }, "WEB")).rejects.toThrow();
  });
});

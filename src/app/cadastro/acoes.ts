"use server";

import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import { criarSessao } from "@/lib/auth";
import { criarCondominio } from "@/lib/onboarding";
import { ErroOperacao } from "@/lib/operacao";

export type EstadoCadastro = { erro: string; valores: Record<string, string> };

export async function cadastrar(_e: EstadoCadastro, f: FormData): Promise<EstadoCadastro> {
  const valores = Object.fromEntries([...f.entries()].filter(([k]) => k !== "senha").map(([k, v]) => [k, String(v)]));
  let usuarioId: string;
  try {
    const { usuario } = await criarCondominio({
      ...valores,
      senha: String(f.get("senha") ?? ""),
      pracaAlimentacao: f.get("pracaAlimentacao") === "on",
      lojas: f.get("lojas") === "on",
      aceite: f.get("aceite") === "on",
    });
    usuarioId = usuario.id;
  } catch (e) {
    if (e instanceof ZodError) return { erro: z.prettifyError(e), valores };
    if (e instanceof ErroOperacao) return { erro: e.message, valores };
    console.error("[cadastro] falhou", e);
    return { erro: "Não foi possível concluir o cadastro agora. Tente novamente em instantes.", valores };
  }
  await criarSessao("usuario", usuarioId);
  redirect("/configuracoes?bemvindo=1");
}

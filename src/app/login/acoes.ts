"use server";

import { redirect } from "next/navigation";
import { criarSessao, encerrarSessao, verificarCredenciais } from "@/lib/auth";

export async function entrar(_estado: { erro: string; login: string }, formData: FormData) {
  const login = String(formData.get("login") ?? "");
  const usuario = await verificarCredenciais(login, String(formData.get("senha") ?? ""));
  if (!usuario) return { erro: "Usuário ou senha incorretos.", login };
  await criarSessao(usuario.id);
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}

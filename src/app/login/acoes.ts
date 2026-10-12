"use server";

import { redirect } from "next/navigation";
import {
  criarSessao,
  encerrarSessao,
  limparFalhasLogin,
  loginBloqueado,
  registrarFalhaLogin,
  verificarCredenciais,
} from "@/lib/auth";
import { auditar } from "@/lib/auditoria";

export async function entrar(_estado: { erro: string; login: string }, formData: FormData) {
  const login = String(formData.get("login") ?? "").trim().toLowerCase();
  if (await loginBloqueado(login)) {
    return { erro: "Muitas tentativas. Aguarde 15 minutos e tente de novo.", login };
  }
  const usuario = await verificarCredenciais(login, String(formData.get("senha") ?? ""));
  if (!usuario) {
    await registrarFalhaLogin(login);
    return { erro: "Usuário ou senha incorretos.", login };
  }
  await limparFalhasLogin(login);
  await criarSessao("usuario", usuario.id);
  await auditar("login", usuario.nome, usuario.condominioId);
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}

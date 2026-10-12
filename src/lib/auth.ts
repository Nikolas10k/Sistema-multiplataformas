import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Papel } from "@prisma/client";
import { db } from "./db";

export const COOKIE_SESSAO = "sessao";
const DURACAO_SEGUNDOS = 60 * 60 * 14; // cobre um plantão de 12h com folga

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) throw new Error("SESSION_SECRET ausente ou curto (mínimo 32 caracteres).");
  return new TextEncoder().encode(segredo);
}

export async function criarSessao(usuarioId: string) {
  const token = await new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_SEGUNDOS}s`)
    .sign(chave());
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function usuarioAtual() {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave());
    if (!payload.sub) return null;
    const usuario = await db.usuario.findUnique({ where: { id: payload.sub } });
    return usuario?.ativo ? usuario : null;
  } catch {
    return null;
  }
}

/** Garante usuário logado (e, opcionalmente, com um dos papéis). Redireciona caso contrário. */
export async function exigirUsuario(papeis?: Papel[]) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (papeis && !papeis.includes(usuario.papel)) redirect("/");
  return usuario;
}

export async function verificarCredenciais(login: string, senha: string) {
  const usuario = await db.usuario.findUnique({ where: { login: login.trim().toLowerCase() } });
  if (!usuario || !usuario.ativo) return null;
  return (await bcrypt.compare(senha, usuario.senhaHash)) ? usuario : null;
}

export function gerarHashSenha(senha: string) {
  return bcrypt.hash(senha, 10);
}

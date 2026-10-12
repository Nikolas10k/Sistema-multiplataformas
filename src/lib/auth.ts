import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Condominio, Papel, Usuario } from "@prisma/client";
import { db } from "./db";
import { situacaoAcesso, type SituacaoAcesso } from "./condominio";
import { relogioDe, type Relogio } from "./tempo";

export const COOKIE_SESSAO = "sessao";
const DURACAO_SEGUNDOS = 60 * 60 * 14; // cobre um plantão de 12h com folga

/** Tudo o que uma ação precisa saber sobre quem está agindo e em qual condomínio. */
export type Contexto = { usuario: Usuario; condominio: Condominio; relogio: Relogio; acesso: SituacaoAcesso };

export function contextoDe(usuario: Usuario & { condominio: Condominio }): Contexto {
  const { condominio, ...u } = usuario;
  return { usuario: u, condominio, relogio: relogioDe(condominio), acesso: situacaoAcesso(condominio) };
}

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) throw new Error("SESSION_SECRET ausente ou curto (mínimo 32 caracteres).");
  return new TextEncoder().encode(segredo);
}

type TipoSessao = "usuario" | "admin";

export async function criarSessao(tipo: TipoSessao, id: string) {
  const token = await new SignJWT({ sub: id, tipo })
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

async function lerSessao(): Promise<{ id: string; tipo: TipoSessao } | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave());
    if (!payload.sub || (payload.tipo !== "usuario" && payload.tipo !== "admin")) return null;
    return { id: payload.sub, tipo: payload.tipo };
  } catch {
    return null;
  }
}

export async function contextoAtual(): Promise<Contexto | null> {
  const sessao = await lerSessao();
  if (sessao?.tipo !== "usuario") return null;
  const usuario = await db.usuario.findUnique({ where: { id: sessao.id }, include: { condominio: true } });
  if (!usuario?.ativo || usuario.condominio.status === "CANCELADO") return null;
  return contextoDe(usuario);
}

/**
 * Garante usuário logado (e, opcionalmente, com um dos papéis).
 * Se o condomínio estiver bloqueado (teste expirado, inadimplência), manda para a tela de assinatura.
 */
export async function exigirContexto(opcoes: { papeis?: Papel[]; permitirBloqueado?: boolean } = {}): Promise<Contexto> {
  const ctx = await contextoAtual();
  if (!ctx) redirect("/login");
  if (!ctx.acesso.liberado && !opcoes.permitirBloqueado) redirect("/assinatura");
  if (opcoes.papeis && !opcoes.papeis.includes(ctx.usuario.papel)) redirect("/");
  return ctx;
}

export async function adminAtual() {
  const sessao = await lerSessao();
  if (sessao?.tipo !== "admin") return null;
  return db.adminPlataforma.findUnique({ where: { id: sessao.id } });
}

export async function exigirAdmin() {
  const admin = await adminAtual();
  if (!admin) redirect("/plataforma/login");
  return admin;
}

// ------------------------------------------------------------------
// Limite de tentativas de login (por IP + login), em memória.
// ------------------------------------------------------------------

const JANELA_MS = 15 * 60_000;
const MAX_TENTATIVAS = 8;
const tentativas = new Map<string, { quantidade: number; desde: number }>();

async function chaveTentativa(login: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  return `${ip}:${login}`;
}

export async function loginBloqueado(login: string): Promise<boolean> {
  const t = tentativas.get(await chaveTentativa(login));
  return Boolean(t && Date.now() - t.desde < JANELA_MS && t.quantidade >= MAX_TENTATIVAS);
}

export async function registrarFalhaLogin(login: string) {
  const k = await chaveTentativa(login);
  const t = tentativas.get(k);
  if (!t || Date.now() - t.desde > JANELA_MS) tentativas.set(k, { quantidade: 1, desde: Date.now() });
  else t.quantidade++;
  if (tentativas.size > 10_000) tentativas.clear();
}

export async function limparFalhasLogin(login: string) {
  tentativas.delete(await chaveTentativa(login));
}

export async function verificarCredenciais(login: string, senha: string) {
  const usuario = await db.usuario.findUnique({ where: { login: login.trim().toLowerCase() } });
  if (!usuario || !usuario.ativo) {
    await bcrypt.compare(senha, "$2a$10$abcdefghijklmnopqrstuuJ0QmQ2b9P8c4m3b7s1fXg8y0YQhQ2a"); // tempo constante
    return null;
  }
  return (await bcrypt.compare(senha, usuario.senhaHash)) ? usuario : null;
}

export async function verificarAdmin(email: string, senha: string) {
  const admin = await db.adminPlataforma.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!admin) return null;
  return (await bcrypt.compare(senha, admin.senhaHash)) ? admin : null;
}

export function gerarHashSenha(senha: string) {
  return bcrypt.hash(senha, 10);
}

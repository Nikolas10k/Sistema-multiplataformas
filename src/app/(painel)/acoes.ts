"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import type { Papel, TipoLocal, Turno } from "@prisma/client";
import { exigirUsuario, gerarHashSenha } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ErroOperacao,
  atualizarApoio,
  atualizarOcorrencia,
  registrarAcesso,
  registrarOcorrencia,
  registrarRonda,
  registrarSaida,
  solicitarApoio,
} from "@/lib/operacao";
import { podeAdministrarSistema, podeConferirLivro } from "@/lib/permissoes";
import { conversar } from "@/lib/agente/executar";
import { gerarLivroDiario, gerarPassagemTurno } from "@/lib/agente/relatorios";
import { dataParaBanco, plantaoEm } from "@/lib/tempo";
import { normalizarTelefone } from "@/lib/whatsapp";

function mensagemDeErro(e: unknown): string | null {
  if (e instanceof ErroOperacao) return e.message;
  if (e instanceof ZodError) return `Dados inválidos: ${z.prettifyError(e)}`;
  return null;
}

/** Executa a ação, atualiza a página e mostra erro/sucesso pela URL. */
async function executar(caminho: string, acao: () => Promise<unknown>, sucesso?: string) {
  let destino = caminho;
  try {
    await acao();
    if (sucesso) destino = `${caminho}?ok=${encodeURIComponent(sucesso)}`;
  } catch (e) {
    const msg = mensagemDeErro(e);
    if (!msg) throw e;
    destino = `${caminho}?erro=${encodeURIComponent(msg)}`;
  }
  revalidatePath(caminho);
  redirect(destino);
}

function texto(f: FormData, campo: string): string | undefined {
  const v = f.get(campo);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// ------------------------------------------------------------------ operação

export async function acaoRegistrarRonda(f: FormData) {
  const usuario = await exigirUsuario();
  await executar(
    "/rondas",
    () =>
      registrarRonda(
        { local: texto(f, "local") ?? "", com_alteracao: f.get("com_alteracao") === "on", observacao: texto(f, "observacao") },
        usuario,
        "WEB",
      ),
    "Ronda registrada.",
  );
}

export async function acaoRegistrarOcorrencia(f: FormData) {
  const usuario = await exigirUsuario();
  await executar(
    "/ocorrencias",
    () =>
      registrarOcorrencia(
        {
          titulo: texto(f, "titulo") ?? "",
          descricao: texto(f, "descricao") ?? "",
          categoria: texto(f, "categoria") as never,
          prioridade: texto(f, "prioridade") as never,
          setor: texto(f, "setor") as never,
          local: texto(f, "local"),
          sala: texto(f, "sala"),
        },
        usuario,
        "WEB",
      ),
    "Ocorrência registrada.",
  );
}

export async function acaoAtualizarOcorrencia(f: FormData) {
  const usuario = await exigirUsuario();
  await executar(
    "/ocorrencias",
    () =>
      atualizarOcorrencia(
        {
          id: Number(f.get("id")),
          status: texto(f, "status") as never,
          resolucao: texto(f, "resolucao"),
        },
        usuario,
      ),
    "Ocorrência atualizada.",
  );
}

export async function acaoRegistrarAcesso(f: FormData) {
  const usuario = await exigirUsuario();
  const doc = texto(f, "documento")?.replace(/\D/g, "");
  await executar(
    "/acessos",
    () =>
      registrarAcesso(
        {
          nome: texto(f, "nome") ?? "",
          tipo: texto(f, "tipo") as never,
          sala: texto(f, "sala"),
          empresa: texto(f, "empresa"),
          documento_final: doc ? doc.slice(-4) : undefined,
          local: texto(f, "local"),
          cadastrado_invenzi: f.get("cadastrado_invenzi") === "on",
          observacao: texto(f, "observacao"),
        },
        usuario,
        "WEB",
      ),
    "Entrada registrada.",
  );
}

export async function acaoRegistrarSaida(f: FormData) {
  await exigirUsuario();
  await executar("/acessos", () => registrarSaida(String(f.get("id"))), "Saída registrada.");
}

export async function acaoConfirmarInvenzi(f: FormData) {
  await exigirUsuario();
  await executar("/acessos", () =>
    db.registroAcesso.update({ where: { id: String(f.get("id")) }, data: { cadastradoInvenzi: true } }),
  );
}

export async function acaoSolicitarApoio(f: FormData) {
  const usuario = await exigirUsuario();
  await executar(
    "/acessibilidade",
    () =>
      solicitarApoio(
        {
          pessoa: texto(f, "pessoa") ?? "",
          necessidade: texto(f, "necessidade") as never,
          destino: texto(f, "destino"),
          observacao: texto(f, "observacao"),
        },
        usuario,
      ),
    "Pedido de apoio registrado.",
  );
}

export async function acaoAtualizarApoio(f: FormData) {
  const usuario = await exigirUsuario();
  await executar("/acessibilidade", () =>
    atualizarApoio({ id: String(f.get("id")), status: texto(f, "status") as never }, usuario),
  );
}

// ------------------------------------------------------------------ relatórios

export async function acaoGerarPassagem() {
  const usuario = await exigirUsuario();
  await gerarPassagemTurno(plantaoEm(), usuario);
  revalidatePath("/passagem");
  redirect("/passagem?ok=Passagem%20de%20turno%20gerada.");
}

export async function acaoGerarLivro(f: FormData) {
  const usuario = await exigirUsuario();
  if (!podeConferirLivro(usuario.papel)) redirect("/");
  const data = String(f.get("data"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) redirect("/livro?erro=Data%20inv%C3%A1lida");
  await gerarLivroDiario(data);
  revalidatePath("/livro");
  redirect(`/livro?data=${data}`);
}

export async function acaoConferirLivro(f: FormData) {
  const usuario = await exigirUsuario();
  if (!podeConferirLivro(usuario.papel)) redirect("/");
  const data = String(f.get("data"));
  await db.livroDiario.update({
    where: { data: dataParaBanco(data) },
    data: { conferidoPor: usuario.nome, conferidoEm: new Date() },
  });
  revalidatePath("/livro");
  redirect(`/livro?data=${data}`);
}

// ------------------------------------------------------------------ agente

export async function acaoEnviarAoAgente(textoMensagem: string): Promise<{ resposta?: string; erro?: string }> {
  const usuario = await exigirUsuario();
  const limpo = textoMensagem.trim();
  if (!limpo) return { erro: "Mensagem vazia." };
  try {
    return { resposta: await conversar(usuario, "WEB", { texto: limpo }) };
  } catch (e) {
    console.error("[agente] falhou", e);
    return { erro: "O agente não conseguiu responder agora. Verifique a chave da API e tente novamente." };
  }
}

// ------------------------------------------------------------------ cadastros (TI / Administração)

async function exigirAdmin() {
  const usuario = await exigirUsuario();
  if (!podeAdministrarSistema(usuario.papel)) redirect("/");
  return usuario;
}

export async function acaoSalvarUsuario(f: FormData) {
  await exigirAdmin();
  const id = texto(f, "id");
  const senha = texto(f, "senha");
  const telefone = texto(f, "telefone");
  const diaFolga = texto(f, "diaFolga");
  await executar(
    "/admin",
    async () => {
      if (!id && !senha) throw new ErroOperacao("Informe uma senha para o novo usuário.");
      if (senha && senha.length < 6) throw new ErroOperacao("A senha precisa de pelo menos 6 caracteres.");
      const dados = {
        nome: texto(f, "nome") ?? "",
        login: (texto(f, "login") ?? "").toLowerCase(),
        papel: texto(f, "papel") as Papel,
        telefone: telefone ? normalizarTelefone(telefone) : null,
        equipeId: texto(f, "equipeId") ?? null,
        horaInicio: texto(f, "horaInicio") ?? null,
        horaFim: texto(f, "horaFim") ?? null,
        diaFolga: diaFolga !== undefined ? Number(diaFolga) : null,
        ativo: f.get("ativo") === "on",
        ...(senha ? { senhaHash: await gerarHashSenha(senha) } : {}),
      };
      if (!dados.nome || !dados.login) throw new ErroOperacao("Nome e login são obrigatórios.");
      try {
        if (id) await db.usuario.update({ where: { id }, data: dados });
        else await db.usuario.create({ data: { ...dados, senhaHash: dados.senhaHash! } });
      } catch (e) {
        if (e instanceof Error && "code" in e && e.code === "P2002")
          throw new ErroOperacao("Já existe um usuário com esse login ou telefone.");
        throw e;
      }
    },
    "Usuário salvo.",
  );
}

export async function acaoSalvarLocal(f: FormData) {
  await exigirAdmin();
  const id = texto(f, "id");
  const intervalo = texto(f, "intervaloRondaMin");
  await executar(
    "/admin",
    async () => {
      const dados = {
        nome: texto(f, "nome") ?? "",
        tipo: texto(f, "tipo") as TipoLocal,
        ordem: Number(texto(f, "ordem") ?? 0),
        exigeRonda: f.get("exigeRonda") === "on",
        intervaloRondaMin: intervalo ? Number(intervalo) : null,
        ativo: f.get("ativo") === "on",
      };
      if (!dados.nome) throw new ErroOperacao("Informe o nome do local.");
      if (id) await db.local.update({ where: { id }, data: dados });
      else await db.local.create({ data: dados });
    },
    "Local salvo.",
  );
}

export async function acaoSalvarEquipe(f: FormData) {
  await exigirAdmin();
  const id = String(f.get("id"));
  await executar(
    "/admin",
    () =>
      db.equipe.update({
        where: { id },
        data: { turno: texto(f, "turno") as Turno, dataReferencia: dataParaBanco(String(f.get("dataReferencia"))) },
      }),
    "Escala da equipe salva.",
  );
}

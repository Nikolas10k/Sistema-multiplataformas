"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import { Prisma, type Papel, type TipoLocal, type Turno } from "@prisma/client";
import { exigirContexto, gerarHashSenha, type Contexto } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditar } from "@/lib/auditoria";
import {
  ErroOperacao,
  atualizarApoio,
  atualizarOcorrencia,
  confirmarInvenzi,
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
  const ctx = await exigirContexto();
  await executar(
    "/rondas",
    () =>
      registrarRonda(
        ctx,
        { local: texto(f, "local") ?? "", com_alteracao: f.get("com_alteracao") === "on", observacao: texto(f, "observacao") },
        "WEB",
      ),
    "Ronda registrada.",
  );
}

export async function acaoRegistrarOcorrencia(f: FormData) {
  const ctx = await exigirContexto();
  await executar(
    "/ocorrencias",
    () =>
      registrarOcorrencia(
        ctx,
        {
          titulo: texto(f, "titulo") ?? "",
          descricao: texto(f, "descricao") ?? "",
          categoria: texto(f, "categoria") as never,
          prioridade: texto(f, "prioridade") as never,
          setor: texto(f, "setor") as never,
          local: texto(f, "local"),
          sala: texto(f, "sala"),
        },
        "WEB",
      ),
    "Ocorrência registrada.",
  );
}

export async function acaoAtualizarOcorrencia(f: FormData) {
  const ctx = await exigirContexto();
  await executar(
    "/ocorrencias",
    () =>
      atualizarOcorrencia(ctx, {
        numero: Number(f.get("numero")),
        status: texto(f, "status") as never,
        resolucao: texto(f, "resolucao"),
      }),
    "Ocorrência atualizada.",
  );
}

export async function acaoRegistrarAcesso(f: FormData) {
  const ctx = await exigirContexto();
  const doc = texto(f, "documento")?.replace(/\D/g, "");
  await executar(
    "/acessos",
    () =>
      registrarAcesso(
        ctx,
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
        "WEB",
      ),
    "Entrada registrada.",
  );
}

export async function acaoRegistrarSaida(f: FormData) {
  const ctx = await exigirContexto();
  await executar("/acessos", () => registrarSaida(ctx.condominio.id, String(f.get("id"))), "Saída registrada.");
}

export async function acaoConfirmarInvenzi(f: FormData) {
  const ctx = await exigirContexto();
  await executar("/acessos", () => confirmarInvenzi(ctx.condominio.id, String(f.get("id"))));
}

export async function acaoSolicitarApoio(f: FormData) {
  const ctx = await exigirContexto();
  await executar(
    "/acessibilidade",
    () =>
      solicitarApoio(ctx, {
        pessoa: texto(f, "pessoa") ?? "",
        necessidade: texto(f, "necessidade") as never,
        destino: texto(f, "destino"),
        observacao: texto(f, "observacao"),
      }),
    "Pedido de apoio registrado.",
  );
}

export async function acaoAtualizarApoio(f: FormData) {
  const ctx = await exigirContexto();
  await executar("/acessibilidade", () => atualizarApoio(ctx, { id: String(f.get("id")), status: texto(f, "status") as never }));
}

// ------------------------------------------------------------------ relatórios

export async function acaoGerarPassagem() {
  const ctx = await exigirContexto();
  await gerarPassagemTurno(ctx.condominio, plantaoEm(ctx.relogio), ctx.usuario);
  revalidatePath("/passagem");
  redirect("/passagem?ok=Passagem%20de%20turno%20gerada.");
}

export async function acaoGerarLivro(f: FormData) {
  const ctx = await exigirContexto();
  if (!podeConferirLivro(ctx.usuario.papel)) redirect("/");
  const data = String(f.get("data"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) redirect("/livro?erro=Data%20inv%C3%A1lida");
  await gerarLivroDiario(ctx.condominio, data);
  revalidatePath("/livro");
  redirect(`/livro?data=${data}`);
}

export async function acaoConferirLivro(f: FormData) {
  const ctx = await exigirContexto();
  if (!podeConferirLivro(ctx.usuario.papel)) redirect("/");
  const data = String(f.get("data"));
  await db.livroDiario.updateMany({
    where: { condominioId: ctx.condominio.id, data: dataParaBanco(data), conferidoEm: null },
    data: { conferidoPor: ctx.usuario.nome, conferidoEm: new Date() },
  });
  await auditar("livro.conferido", ctx.usuario.nome, ctx.condominio.id, { data });
  revalidatePath("/livro");
  redirect(`/livro?data=${data}`);
}

// ------------------------------------------------------------------ agente

export async function acaoEnviarAoAgente(textoMensagem: string): Promise<{ resposta?: string; erro?: string }> {
  const ctx = await exigirContexto();
  const limpo = textoMensagem.trim().slice(0, 4000);
  if (!limpo) return { erro: "Mensagem vazia." };
  try {
    return { resposta: await conversar(ctx, "WEB", { texto: limpo }) };
  } catch (e) {
    console.error("[agente] falhou", e);
    return { erro: "O agente não conseguiu responder agora. Tente novamente em instantes." };
  }
}

// ------------------------------------------------------------------ cadastros (gestão)

async function exigirGestor(): Promise<Contexto> {
  const ctx = await exigirContexto();
  if (!podeAdministrarSistema(ctx.usuario.papel)) redirect("/");
  return ctx;
}

const PAPEIS: Papel[] = ["TI_ADMIN", "SINDICA", "ADMINISTRACAO", "FINANCEIRO", "SUPERVISOR", "ENCARREGADO", "PORTEIRO", "RECEPCIONISTA"];

export async function acaoSalvarUsuario(f: FormData) {
  const ctx = await exigirGestor();
  const id = texto(f, "id");
  const senha = texto(f, "senha");
  const telefone = texto(f, "telefone");
  const diaFolga = texto(f, "diaFolga");
  const equipeId = texto(f, "equipeId") ?? null;
  await executar(
    "/admin",
    async () => {
      if (!id && !senha) throw new ErroOperacao("Informe uma senha para o novo usuário.");
      if (senha && senha.length < 8) throw new ErroOperacao("A senha precisa de pelo menos 8 caracteres.");
      const papel = texto(f, "papel") as Papel;
      if (!PAPEIS.includes(papel)) throw new ErroOperacao("Função inválida.");
      if (equipeId && !(await db.equipe.findFirst({ where: { id: equipeId, condominioId: ctx.condominio.id } }))) {
        throw new ErroOperacao("Equipe inválida.");
      }
      const dados = {
        nome: texto(f, "nome") ?? "",
        login: (texto(f, "login") ?? "").toLowerCase(),
        papel,
        telefone: telefone ? normalizarTelefone(telefone) : null,
        equipeId,
        horaInicio: texto(f, "horaInicio") ?? null,
        horaFim: texto(f, "horaFim") ?? null,
        diaFolga: diaFolga !== undefined ? Number(diaFolga) : null,
        ativo: f.get("ativo") === "on",
        ...(senha ? { senhaHash: await gerarHashSenha(senha) } : {}),
      };
      if (!dados.nome || !/^[a-z0-9._-]{3,40}$/.test(dados.login)) {
        throw new ErroOperacao("Informe nome e um login de 3 a 40 letras minúsculas, números, ponto, hífen ou sublinhado.");
      }
      if (id && id === ctx.usuario.id && (!dados.ativo || !podeAdministrarSistema(papel))) {
        throw new ErroOperacao("Você não pode desativar nem tirar o seu próprio acesso de gestão.");
      }
      if (!id || dados.ativo) {
        const plano = ctx.condominio.planoId ? await db.plano.findUnique({ where: { id: ctx.condominio.planoId } }) : null;
        if (plano?.maxUsuarios) {
          const ativos = await db.usuario.count({ where: { condominioId: ctx.condominio.id, ativo: true, NOT: id ? { id } : undefined } });
          if (ativos >= plano.maxUsuarios) {
            throw new ErroOperacao(`O plano ${plano.nome} permite até ${plano.maxUsuarios} usuários ativos. Amplie o plano em Assinatura.`);
          }
        }
      }
      try {
        if (id) {
          const { count } = await db.usuario.updateMany({ where: { id, condominioId: ctx.condominio.id }, data: dados });
          if (!count) throw new ErroOperacao("Usuário não encontrado.");
        } else {
          await db.usuario.create({ data: { ...dados, condominioId: ctx.condominio.id, senhaHash: dados.senhaHash! } });
        }
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
          throw new ErroOperacao("Já existe um usuário com esse login ou com esse WhatsApp.");
        throw e;
      }
      await auditar(id ? "usuario.alterado" : "usuario.criado", ctx.usuario.nome, ctx.condominio.id, {
        login: dados.login,
        papel,
        ativo: dados.ativo,
        senhaAlterada: Boolean(senha),
      });
    },
    "Usuário salvo.",
  );
}

export async function acaoSalvarLocal(f: FormData) {
  const ctx = await exigirGestor();
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
        intervaloRondaMin: intervalo ? Math.max(15, Number(intervalo)) : null,
        ativo: f.get("ativo") === "on",
      };
      if (!dados.nome) throw new ErroOperacao("Informe o nome do local.");
      try {
        if (id) {
          const { count } = await db.local.updateMany({ where: { id, condominioId: ctx.condominio.id }, data: dados });
          if (!count) throw new ErroOperacao("Local não encontrado.");
        } else {
          await db.local.create({ data: { ...dados, condominioId: ctx.condominio.id } });
        }
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
          throw new ErroOperacao("Já existe um local com esse nome.");
        throw e;
      }
    },
    "Local salvo.",
  );
}

export async function acaoSalvarEquipe(f: FormData) {
  const ctx = await exigirGestor();
  const id = String(f.get("id"));
  await executar(
    "/admin",
    async () => {
      const turno = texto(f, "turno") as Turno;
      if (turno !== "DIA" && turno !== "NOITE") throw new ErroOperacao("Turno inválido.");
      const data = String(f.get("dataReferencia"));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroOperacao("Data inválida.");
      const { count } = await db.equipe.updateMany({
        where: { id, condominioId: ctx.condominio.id },
        data: { turno, dataReferencia: dataParaBanco(data) },
      });
      if (!count) throw new ErroOperacao("Equipe não encontrada.");
    },
    "Escala da equipe salva.",
  );
}

export async function acaoCriarEquipe(f: FormData) {
  const ctx = await exigirGestor();
  await executar(
    "/admin",
    async () => {
      const nome = (texto(f, "nome") ?? "").toUpperCase().slice(0, 20);
      const turno = texto(f, "turno") as Turno;
      const data = String(f.get("dataReferencia"));
      if (!nome || (turno !== "DIA" && turno !== "NOITE") || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        throw new ErroOperacao("Informe nome, turno e uma data de referência.");
      }
      try {
        await db.equipe.create({ data: { condominioId: ctx.condominio.id, nome, turno, dataReferencia: dataParaBanco(data) } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ErroOperacao("Já existe essa equipe.");
        throw e;
      }
    },
    "Equipe criada.",
  );
}

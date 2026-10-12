import type { Condominio, Ocorrencia, Setor } from "@prisma/client";
import { db } from "./db";
import { PAPEIS_DO_SETOR, NOME_SETOR } from "./permissoes";
import { contaDoCondominio, enviarTexto } from "./whatsapp";
import { formatarDataHora, relogioDe } from "./tempo";

export async function telefonesDoSetor(condominioId: string, setor: Setor): Promise<string[]> {
  const usuarios = await db.usuario.findMany({
    where: { condominioId, ativo: true, papel: { in: PAPEIS_DO_SETOR[setor] }, telefone: { not: null } },
    select: { telefone: true },
  });
  return usuarios.map((u) => u.telefone!).filter(Boolean);
}

/** Envia o mesmo texto para vários números do condomínio; devolve quantos receberam. */
export async function enviarParaVarios(condominio: Condominio, telefones: Iterable<string>, texto: string): Promise<number> {
  let conta;
  try {
    conta = contaDoCondominio(condominio);
  } catch (e) {
    console.error("[whatsapp] token do condomínio ilegível", condominio.id, e);
    return 0;
  }
  const unicos = [...new Set(telefones)];
  const resultados = await Promise.all(unicos.map((t) => enviarTexto(conta, t, texto)));
  return resultados.filter(Boolean).length;
}

/** Avisa o setor responsável por WhatsApp (ocorrências ALTA e URGENTE). Devolve quantas pessoas receberam. */
export async function notificarSetor(
  condominio: Condominio,
  ocorrencia: Ocorrencia & { local?: { nome: string } | null },
): Promise<number> {
  const telefones = new Set(await telefonesDoSetor(condominio.id, ocorrencia.setor));
  // Urgências também vão para o supervisor e para os encarregados.
  if (ocorrencia.prioridade === "URGENTE") {
    for (const t of await telefonesDoSetor(condominio.id, "SUPERVISOR")) telefones.add(t);
    for (const t of await telefonesDoSetor(condominio.id, "PORTARIA")) telefones.add(t);
  }
  if (telefones.size === 0) return 0;

  const onde = [ocorrencia.local?.nome, ocorrencia.sala && `sala ${ocorrencia.sala}`].filter(Boolean).join(" · ");
  const texto = [
    `${ocorrencia.prioridade === "URGENTE" ? "🚨 URGENTE" : "⚠️ Prioridade alta"} · Ocorrência #${ocorrencia.numero}`,
    `*${ocorrencia.titulo}*`,
    onde && `Local: ${onde}`,
    ocorrencia.descricao,
    `Setor: ${NOME_SETOR[ocorrencia.setor]} · ${formatarDataHora(relogioDe(condominio), ocorrencia.criadaEm)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const enviados = await enviarParaVarios(condominio, telefones, texto);
  if (enviados > 0) {
    await db.ocorrencia.update({ where: { id: ocorrencia.id }, data: { setorNotificadoEm: new Date() } });
  }
  return enviados;
}

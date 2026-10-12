import type { Ocorrencia, Setor } from "@prisma/client";
import { db } from "./db";
import { PAPEIS_DO_SETOR, NOME_SETOR } from "./permissoes";
import { enviarTexto } from "./whatsapp";
import { formatarDataHora } from "./tempo";

export async function telefonesDoSetor(setor: Setor): Promise<string[]> {
  const usuarios = await db.usuario.findMany({
    where: { ativo: true, papel: { in: PAPEIS_DO_SETOR[setor] }, telefone: { not: null } },
    select: { telefone: true },
  });
  return usuarios.map((u) => u.telefone!).filter(Boolean);
}

/** Avisa o setor responsável por WhatsApp (ocorrências ALTA e URGENTE). Devolve quantas pessoas receberam. */
export async function notificarSetor(ocorrencia: Ocorrencia & { local?: { nome: string } | null }): Promise<number> {
  const telefones = new Set(await telefonesDoSetor(ocorrencia.setor));
  // Urgências também vão para o supervisor e para o encarregado.
  if (ocorrencia.prioridade === "URGENTE") {
    for (const t of await telefonesDoSetor("SUPERVISOR")) telefones.add(t);
    for (const t of await telefonesDoSetor("PORTARIA")) telefones.add(t);
  }
  if (telefones.size === 0) return 0;

  const onde = [ocorrencia.local?.nome, ocorrencia.sala && `sala ${ocorrencia.sala}`].filter(Boolean).join(" · ");
  const texto = [
    `${ocorrencia.prioridade === "URGENTE" ? "🚨 URGENTE" : "⚠️ Prioridade alta"} · Ocorrência #${ocorrencia.id}`,
    `*${ocorrencia.titulo}*`,
    onde && `Local: ${onde}`,
    ocorrencia.descricao,
    `Setor: ${NOME_SETOR[ocorrencia.setor]} · ${formatarDataHora(ocorrencia.criadaEm)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const enviados = (await Promise.all([...telefones].map((t) => enviarTexto(t, texto)))).filter(Boolean).length;
  if (enviados > 0) {
    await db.ocorrencia.update({ where: { id: ocorrencia.id }, data: { setorNotificadoEm: new Date() } });
  }
  return enviados;
}

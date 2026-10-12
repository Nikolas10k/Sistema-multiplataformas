import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const TIPOS_IMAGEM_ACEITOS = Object.keys(EXTENSOES);

function pasta() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "uploads");
}

/** Salva a foto e devolve o nome do arquivo (servido em /api/arquivos/<nome>). */
export async function salvarImagem(dados: Buffer, mimeType: string): Promise<string> {
  const ext = EXTENSOES[mimeType];
  if (!ext) throw new Error(`Tipo de imagem não aceito: ${mimeType}`);
  await mkdir(pasta(), { recursive: true });
  const nome = `${randomUUID()}.${ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ pasta(), nome), dados);
  return nome;
}

const NOME_VALIDO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function lerImagem(nome: string): Promise<{ dados: Buffer; mimeType: string } | null> {
  if (!NOME_VALIDO.test(nome)) return null;
  try {
    const dados = await readFile(path.join(/*turbopackIgnore: true*/ pasta(), nome));
    const ext = nome.split(".").pop()!;
    const mimeType = Object.entries(EXTENSOES).find(([, e]) => e === ext)![0];
    return { dados, mimeType };
  } catch {
    return null;
  }
}

export function urlArquivo(nome: string) {
  return `/api/arquivos/${nome}`;
}

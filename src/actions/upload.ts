"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");

export async function uploadProductImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { success: false, message: "Nenhum arquivo enviado" };

  // Validação de tipo
  if (!file.type.startsWith("image/")) {
    return { success: false, message: "Apenas imagens são permitidas" };
  }

  // Validação de tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, message: "Imagem muito grande (máx 5MB)" };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Garantir que diretório existe
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Nome único para evitar conflitos
    const extension = file.name.split('.').pop();
    const fileName = `${randomUUID()}.${extension}`;
    const path = join(UPLOAD_DIR, fileName);

    await writeFile(path, buffer);

    // Retorna a URL pública
    return { 
      success: true, 
      url: `/uploads/${fileName}` 
    };
  } catch (error) {
    console.error("Erro no upload:", error);
    return { success: false, message: "Falha ao salvar arquivo no servidor" };
  }
}

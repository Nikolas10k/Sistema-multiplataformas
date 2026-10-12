import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Criptografia de segredos guardados no banco (tokens de WhatsApp dos condomínios).
function chave(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (openssl rand -hex 32).");
  return Buffer.from(hex, "hex");
}

export function criptografar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return ["v1", iv.toString("base64"), cifra.getAuthTag().toString("base64"), dados.toString("base64")].join(".");
}

export function descriptografar(valor: string): string {
  const [versao, iv, tag, dados] = valor.split(".");
  if (versao !== "v1" || !iv || !tag || !dados) throw new Error("Valor criptografado inválido.");
  const decifra = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  decifra.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decifra.update(Buffer.from(dados, "base64")), decifra.final()]).toString("utf8");
}

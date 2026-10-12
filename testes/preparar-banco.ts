import { execSync } from "node:child_process";

// Aplica as migrações pendentes no banco de testes (não apaga dados: cada teste usa nomes únicos).
export default function preparar() {
  const url = process.env.DATABASE_URL_TESTE ?? "postgresql://postgres:postgres@localhost:5432/condominio_teste?schema=public";
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["testes/**/*.test.ts"],
    globalSetup: ["testes/preparar-banco.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TESTE ?? "postgresql://postgres:postgres@localhost:5432/condominio_teste?schema=public",
      SESSION_SECRET: "segredo-de-teste-com-mais-de-32-caracteres",
      ENCRYPTION_KEY: "0".repeat(64),
      WHATSAPP_APP_SECRET: "segredo-app",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" impede import fora do servidor Next; nos testes não se aplica.
      "server-only": path.resolve(__dirname, "testes/vazio.ts"),
    },
  },
});

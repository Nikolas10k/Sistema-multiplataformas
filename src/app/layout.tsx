import type { Metadata } from "next";
import "./globals.css";
import { NOME_PRODUTO } from "@/lib/condominio";

export const metadata: Metadata = {
  title: NOME_PRODUTO,
  description: "Operação do condomínio com agente de IA: rondas, ocorrências, controle de acesso e passagem de turno pelo WhatsApp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

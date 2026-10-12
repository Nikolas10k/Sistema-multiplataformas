import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Condomínio Operacional",
  description: "Rondas, ocorrências, controle de acesso e agente operacional do condomínio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

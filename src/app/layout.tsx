import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Givance - Plataforma de Gestão Inteligente",
  description: "Sistema Multi-Nicho: Restaurantes, Clínicas, Varejo e Serviços",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

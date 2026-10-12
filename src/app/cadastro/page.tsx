import Link from "next/link";
import { redirect } from "next/navigation";
import { contextoAtual } from "@/lib/auth";
import { DIAS_TESTE, NOME_PRODUTO } from "@/lib/condominio";
import { FormularioCadastro } from "./FormularioCadastro";

export const metadata = { title: "Cadastre seu condomínio" };

export default async function PaginaCadastro() {
  if (await contextoAtual()) redirect("/");
  return (
    <main className="cadastro">
      <div className="cadastro-cabecalho">
        <h1>{NOME_PRODUTO}</h1>
        <p className="subtitulo">
          Rondas, ocorrências, controle de acesso e passagem de turno com um agente de IA no WhatsApp da sua equipe. Teste grátis
          por {DIAS_TESTE} dias, sem cartão.
        </p>
      </div>
      <FormularioCadastro />
      <p className="suave" style={{ textAlign: "center", marginTop: 16 }}>
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </main>
  );
}

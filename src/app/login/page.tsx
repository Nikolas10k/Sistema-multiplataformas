import { redirect } from "next/navigation";
import Link from "next/link";
import { contextoAtual } from "@/lib/auth";
import { NOME_PRODUTO } from "@/lib/condominio";
import { FormularioLogin } from "./FormularioLogin";

export default async function PaginaLogin() {
  if (await contextoAtual()) redirect("/");
  return (
    <main className="login">
      <div className="cartao">
        <h1>{NOME_PRODUTO}</h1>
        <p className="subtitulo">Entre com seu usuário para continuar.</p>
        <FormularioLogin />
        <p className="suave" style={{ marginTop: 20, textAlign: "center" }}>
          Ainda não usa? <Link href="/cadastro">Cadastre seu condomínio</Link>
        </p>
      </div>
    </main>
  );
}

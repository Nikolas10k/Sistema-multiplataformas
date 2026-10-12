import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { FormularioLogin } from "./FormularioLogin";

export default async function PaginaLogin() {
  if (await usuarioAtual()) redirect("/");
  return (
    <main className="login">
      <div className="cartao">
        <h1>Condomínio Operacional</h1>
        <p className="subtitulo">Entre com seu usuário para continuar.</p>
        <FormularioLogin />
      </div>
    </main>
  );
}

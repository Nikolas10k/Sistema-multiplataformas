import { redirect } from "next/navigation";
import { adminAtual } from "@/lib/auth";
import { NOME_PRODUTO } from "@/lib/condominio";
import { FormularioLoginAdmin } from "./FormularioLoginAdmin";

export default async function LoginPlataforma() {
  if (await adminAtual()) redirect("/plataforma");
  return (
    <main className="login">
      <div className="cartao">
        <h1>{NOME_PRODUTO}</h1>
        <p className="subtitulo">Administração da plataforma</p>
        <FormularioLoginAdmin />
      </div>
    </main>
  );
}

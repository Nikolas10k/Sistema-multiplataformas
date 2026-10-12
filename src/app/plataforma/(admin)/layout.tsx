import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { NOME_PRODUTO } from "@/lib/condominio";
import { sairAdmin } from "../acoes";

export default async function LayoutPlataforma({ children }: { children: React.ReactNode }) {
  const admin = await exigirAdmin();
  return (
    <div className="app">
      <nav className="lateral">
        <div className="marca">
          {NOME_PRODUTO}
          <div className="suave" style={{ color: "#9fb0c8", fontWeight: 500, marginTop: 2 }}>
            Plataforma
          </div>
        </div>
        <Link href="/plataforma">Condomínios</Link>
        <Link href="/plataforma/planos">Planos</Link>
        <div className="rodape">
          <div>{admin.nome}</div>
          <form action={sairAdmin}>
            <button type="submit" className="secundario pequeno">
              Sair
            </button>
          </form>
        </div>
      </nav>
      <main className="conteudo">{children}</main>
    </div>
  );
}

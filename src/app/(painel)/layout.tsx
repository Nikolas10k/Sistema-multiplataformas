import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { NOME_PAPEL, podeAdministrarSistema, podeConferirLivro } from "@/lib/permissoes";
import { sair } from "../login/acoes";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return (
    <div className="app">
      <nav className="lateral">
        <div className="marca">🏢 Condomínio</div>
        <Link href="/">Painel do plantão</Link>
        <Link href="/agente">Agente</Link>
        <Link href="/ocorrencias">Ocorrências</Link>
        <Link href="/rondas">Rondas</Link>
        <Link href="/acessos">Controle de acesso</Link>
        <Link href="/acessibilidade">Acessibilidade</Link>
        <Link href="/passagem">Passagem de turno</Link>
        {podeConferirLivro(usuario.papel) && <Link href="/livro">Livro do dia</Link>}
        {podeAdministrarSistema(usuario.papel) && <Link href="/admin">Cadastros</Link>}
        <div className="rodape">
          <div>{usuario.nome}</div>
          <div>{NOME_PAPEL[usuario.papel]}</div>
          <form action={sair}>
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

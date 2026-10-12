import Link from "next/link";
import { exigirContexto } from "@/lib/auth";
import { NOME_PAPEL, podeAdministrarSistema, podeConferirLivro } from "@/lib/permissoes";
import { NOME_PRODUTO } from "@/lib/condominio";
import { sair } from "../login/acoes";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  // Páginas bloqueadas por assinatura redirecionam sozinhas; o layout também serve /assinatura.
  const { usuario, condominio, acesso } = await exigirContexto({ permitirBloqueado: true });
  const gestor = podeAdministrarSistema(usuario.papel);
  return (
    <div className="app">
      <nav className="lateral">
        <div className="marca">
          {NOME_PRODUTO}
          <div className="suave" style={{ color: "#9fb0c8", fontWeight: 500, marginTop: 2 }}>
            {condominio.nome}
          </div>
        </div>
        {acesso.liberado && (
          <>
            <Link href="/">Painel do plantão</Link>
            <Link href="/agente">Agente</Link>
            <Link href="/ocorrencias">Ocorrências</Link>
            <Link href="/rondas">Rondas</Link>
            <Link href="/acessos">Controle de acesso</Link>
            <Link href="/acessibilidade">Acessibilidade</Link>
            <Link href="/passagem">Passagem de turno</Link>
            {podeConferirLivro(usuario.papel) && <Link href="/livro">Livro do dia</Link>}
            {gestor && <Link href="/admin">Equipe e locais</Link>}
            {gestor && <Link href="/configuracoes">Configurações</Link>}
          </>
        )}
        {gestor && <Link href="/assinatura">Assinatura</Link>}
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
      <main className="conteudo">
        {acesso.aviso && (
          <div className="aviso alerta nao-imprimir">
            {acesso.aviso} {gestor && <Link href="/assinatura">Ver assinatura</Link>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

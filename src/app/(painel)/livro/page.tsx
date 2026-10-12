import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirContexto } from "@/lib/auth";
import { podeConferirLivro } from "@/lib/permissoes";
import { dataDoBanco, dataParaBanco, formatarData, formatarDataHora, ultimoDiaEncerrado } from "@/lib/tempo";
import { Avisos } from "@/componentes/ui";
import { BotaoEnviar } from "@/componentes/BotaoEnviar";
import { BotaoImprimir } from "@/componentes/BotaoImprimir";
import { acaoConferirLivro, acaoGerarLivro } from "../acoes";

export const dynamic = "force-dynamic";

type Params = Promise<{ data?: string; erro?: string }>;

export default async function PaginaLivro({ searchParams }: { searchParams: Params }) {
  const { usuario, condominio, relogio: r } = await exigirContexto();
  if (!podeConferirLivro(usuario.papel)) redirect("/");
  const params = await searchParams;
  const padrao = ultimoDiaEncerrado(r);
  const data = params.data && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : padrao;
  const [livro, recentes] = await Promise.all([
    db.livroDiario.findUnique({ where: { condominioId_data: { condominioId: condominio.id, data: dataParaBanco(data) } } }),
    db.livroDiario.findMany({
      where: { condominioId: condominio.id },
      orderBy: { data: "desc" },
      take: 10,
      select: { data: true, conferidoEm: true },
    }),
  ]);

  return (
    <div className="pilha">
      <div className="cabecalho nao-imprimir">
        <div>
          <h1>Livro de ocorrências</h1>
          <div className="subtitulo">
            Dia operacional das {r.inicioDia} às {r.inicioDia} do dia seguinte. Gerado automaticamente logo após a troca de
            turno da manhã com tudo o que foi registrado; o encarregado ou o supervisor confere e assina.
          </div>
        </div>
      </div>
      <Avisos erro={params.erro} />

      <div className="cartao nao-imprimir">
        <form className="linha" method="get">
          <input type="date" name="data" defaultValue={data} style={{ width: "auto" }} />
          <button type="submit" className="secundario">
            Abrir
          </button>
          <span className="suave">
            Recentes:{" "}
            {recentes.map((r) => (
              <a key={r.data.toISOString()} href={`/livro?data=${dataDoBanco(r.data)}`} style={{ marginRight: 8 }}>
                {formatarData(dataDoBanco(r.data))}
                {r.conferidoEm ? " ✓" : ""}
              </a>
            ))}
          </span>
        </form>
      </div>

      <div className="cartao">
        <div className="linha nao-imprimir" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <strong>{formatarData(data)}</strong>
          <div className="linha">
            <form action={acaoGerarLivro}>
              <input type="hidden" name="data" value={data} />
              <BotaoEnviar texto={livro ? "Gerar de novo" : "Gerar livro"} pendente="Gerando…" secundario={Boolean(livro)} />
            </form>
            {livro && <BotaoImprimir />}
            {livro && !livro.conferidoEm && (
              <form action={acaoConferirLivro}>
                <input type="hidden" name="data" value={data} />
                <button type="submit">Conferi e assino</button>
              </form>
            )}
          </div>
        </div>
        {livro ? (
          <>
            <h2>
              Livro de ocorrências · {condominio.nome} · {formatarData(data)}
            </h2>
            <div className="documento">{livro.conteudo}</div>
            <p className="suave" style={{ marginTop: 16 }}>
              Gerado em {formatarDataHora(r, livro.geradoEm)}.{" "}
              {livro.conferidoEm
                ? `Conferido por ${livro.conferidoPor} em ${formatarDataHora(r, livro.conferidoEm)}.`
                : "Aguardando conferência."}
            </p>
          </>
        ) : (
          <p className="suave">O livro deste dia ainda não foi gerado.</p>
        )}
      </div>
    </div>
  );
}

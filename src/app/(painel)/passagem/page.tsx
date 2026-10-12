import { db } from "@/lib/db";
import { dataDoBanco, formatarData, formatarDataHora, nomeTurno, plantaoEm } from "@/lib/tempo";
import { Avisos, type ParamsAviso } from "@/componentes/ui";
import { BotaoEnviar } from "@/componentes/BotaoEnviar";
import { acaoGerarPassagem } from "../acoes";

export const dynamic = "force-dynamic";

export default async function PaginaPassagem({ searchParams }: { searchParams: ParamsAviso }) {
  const params = await searchParams;
  const passagens = await db.passagemTurno.findMany({
    include: { autor: { select: { nome: true } } },
    orderBy: { geradoEm: "desc" },
    take: 14,
  });
  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Passagem de turno</h1>
          <div className="subtitulo">
            Gerada automaticamente 15 minutos antes de cada troca (06h45 e 18h45) e enviada ao encarregado que assume e ao
            supervisor. Você também pode gerar agora.
          </div>
        </div>
        <form action={acaoGerarPassagem}>
          <BotaoEnviar texto={`Gerar agora (${nomeTurno(plantaoEm().turno)})`} pendente="Gerando…" />
        </form>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />
      {passagens.length === 0 && <p className="suave">Nenhuma passagem gerada ainda.</p>}
      {passagens.map((p) => (
        <div key={p.id} className="cartao">
          <div className="linha" style={{ justifyContent: "space-between" }}>
            <strong>
              {formatarData(dataDoBanco(p.data))} · {nomeTurno(p.turno)}
            </strong>
            <span className="suave">
              gerada {formatarDataHora(p.geradoEm)} {p.autor ? `por ${p.autor.nome}` : "automaticamente"}
            </span>
          </div>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{p.resumo}</div>
        </div>
      ))}
    </div>
  );
}

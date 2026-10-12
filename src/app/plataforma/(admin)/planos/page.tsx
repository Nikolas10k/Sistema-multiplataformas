import type { Plano } from "@prisma/client";
import { db } from "@/lib/db";
import { Avisos } from "@/componentes/ui";
import { salvarPlano } from "../../acoes";

export const dynamic = "force-dynamic";

function FormPlano({ p }: { p?: Plano }) {
  return (
    <form action={salvarPlano} className="formulario" style={{ borderTop: "1px solid var(--borda)", paddingTop: 12 }}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="campos">
        <label>
          Nome
          <input name="nome" defaultValue={p?.nome} required />
        </label>
        <label>
          Preço mensal (R$)
          <input name="precoMensal" defaultValue={p ? Number(p.precoMensal).toFixed(2) : ""} required inputMode="decimal" />
        </label>
        <label>
          Máx. usuários (vazio = ilimitado)
          <input name="maxUsuarios" type="number" min={1} defaultValue={p?.maxUsuarios ?? ""} />
        </label>
        <label>
          Máx. mensagens do agente/mês
          <input name="maxMensagensMes" type="number" min={1} defaultValue={p?.maxMensagensMes ?? ""} />
        </label>
        <label>
          Ordem
          <input name="ordem" type="number" defaultValue={p?.ordem ?? 0} />
        </label>
      </div>
      <label>
        Descrição
        <input name="descricao" defaultValue={p?.descricao} />
      </label>
      <div className="linha">
        <label className="checkbox">
          <input type="checkbox" name="ativo" defaultChecked={p?.ativo ?? true} /> Disponível para contratação
        </label>
        <button type="submit" className="pequeno">
          {p ? "Salvar" : "Criar plano"}
        </button>
      </div>
    </form>
  );
}

export default async function PaginaPlanos({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const params = await searchParams;
  const planos = await db.plano.findMany({ orderBy: { ordem: "asc" }, include: { _count: { select: { condominios: true } } } });
  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Planos</h1>
          <div className="subtitulo">Preços e limites oferecidos aos condomínios.</div>
        </div>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />
      <div className="cartao pilha">
        {planos.map((p) => (
          <div key={p.id}>
            <strong>{p.nome}</strong> <span className="suave">· {p._count.condominios} condomínio(s)</span>
            <FormPlano p={p} />
          </div>
        ))}
        <div>
          <strong>Novo plano</strong>
          <FormPlano />
        </div>
      </div>
    </div>
  );
}

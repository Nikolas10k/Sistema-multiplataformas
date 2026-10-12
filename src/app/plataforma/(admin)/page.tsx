import Link from "next/link";
import { db } from "@/lib/db";
import { NOME_STATUS, situacaoAcesso } from "@/lib/condominio";
import { formatarData, RELOGIO_PADRAO, mesAtual } from "@/lib/tempo";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const CLASSE: Record<string, string> = { TESTE: "info", ATIVO: "ok", INADIMPLENTE: "alerta", SUSPENSO: "perigo", CANCELADO: "" };

type Params = Promise<{ busca?: string; status?: string }>;

export default async function PainelPlataforma({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const mes = mesAtual(RELOGIO_PADRAO);
  const filtroStatus = params.status && params.status in NOME_STATUS ? (params.status as keyof typeof NOME_STATUS) : undefined;
  const [condominios, usos, porStatus, usuarios] = await Promise.all([
    db.condominio.findMany({
      where: {
        status: filtroStatus,
        ...(params.busca ? { OR: [{ nome: { contains: params.busca, mode: "insensitive" } }, { responsavelEmail: { contains: params.busca, mode: "insensitive" } }] } : {}),
      },
      include: { plano: true },
      orderBy: { criadoEm: "desc" },
      take: 200,
    }),
    db.usoMensal.findMany({ where: { mes } }),
    db.condominio.groupBy({ by: ["status"], _count: true }),
    db.usuario.groupBy({ by: ["condominioId"], where: { ativo: true }, _count: true }),
  ]);
  const usoPor = new Map(usos.map((u) => [u.condominioId, u]));
  const usuariosPor = new Map(usuarios.map((u) => [u.condominioId, u._count]));
  const pagantes = await db.condominio.findMany({ where: { status: { in: ["ATIVO", "INADIMPLENTE"] } }, include: { plano: true } });
  const mrr = pagantes.reduce((t, c) => t + Number(c.plano?.precoMensal ?? 0), 0);
  const contagem = (s: string) => porStatus.find((p) => p.status === s)?._count ?? 0;
  const mensagensMes = usos.reduce((t, u) => t + u.mensagens, 0);
  const tokensMes = usos.reduce((t, u) => t + u.tokensEntrada + u.tokensSaida, 0);

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Condomínios</h1>
          <div className="subtitulo">Clientes, receita recorrente e consumo do agente em {mes}.</div>
        </div>
      </div>

      <div className="grade grade-4">
        <div className="cartao">
          <div className="suave">Receita recorrente (MRR)</div>
          <div className="numero-grande">{moeda.format(mrr)}</div>
          <div className="suave">{pagantes.length} pagantes</div>
        </div>
        <div className="cartao">
          <div className="suave">Em teste</div>
          <div className="numero-grande">{contagem("TESTE")}</div>
        </div>
        <div className="cartao">
          <div className="suave">Inadimplentes / suspensos</div>
          <div className="numero-grande">
            {contagem("INADIMPLENTE")} / {contagem("SUSPENSO")}
          </div>
        </div>
        <div className="cartao">
          <div className="suave">Agente no mês</div>
          <div className="numero-grande">{mensagensMes}</div>
          <div className="suave">mensagens · {(tokensMes / 1_000_000).toFixed(2)} M tokens</div>
        </div>
      </div>

      <form className="linha" method="get">
        <input name="busca" defaultValue={params.busca} placeholder="Buscar por nome ou e-mail" style={{ maxWidth: 320 }} />
        <select name="status" defaultValue={filtroStatus ?? ""} style={{ width: "auto" }}>
          <option value="">Todos os status</option>
          {Object.entries(NOME_STATUS).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
        <button type="submit" className="secundario">
          Filtrar
        </button>
      </form>

      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Condomínio</th>
              <th>Status</th>
              <th>Plano</th>
              <th>Usuários</th>
              <th>Mensagens no mês</th>
              <th>WhatsApp</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {condominios.map((c) => {
              const uso = usoPor.get(c.id);
              const acesso = situacaoAcesso(c);
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/plataforma/condominios/${c.id}`}>{c.nome}</Link>
                    <div className="suave">{c.responsavelEmail}</div>
                  </td>
                  <td>
                    <span className={`selo ${CLASSE[c.status]}`}>{NOME_STATUS[c.status]}</span>
                    {!acesso.liberado && c.status !== "SUSPENSO" && c.status !== "CANCELADO" && (
                      <div className="suave">bloqueado</div>
                    )}
                  </td>
                  <td>{c.plano?.nome ?? "—"}</td>
                  <td>
                    {usuariosPor.get(c.id) ?? 0}
                    {c.plano?.maxUsuarios ? ` / ${c.plano.maxUsuarios}` : ""}
                  </td>
                  <td>
                    {uso?.mensagens ?? 0}
                    {c.plano?.maxMensagensMes ? ` / ${c.plano.maxMensagensMes}` : ""}
                  </td>
                  <td>{c.whatsappPhoneNumberId ? <span className="selo ok">ok</span> : <span className="selo">—</span>}</td>
                  <td className="suave">{formatarData(c.criadoEm.toISOString().slice(0, 10))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {condominios.length === 0 && <p className="suave">Nenhum condomínio.</p>}
      </div>
    </div>
  );
}

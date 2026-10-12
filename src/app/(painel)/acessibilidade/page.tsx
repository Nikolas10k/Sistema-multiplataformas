import { db } from "@/lib/db";
import { formatarDataHora, formatarHora, horasAtras } from "@/lib/tempo";
import { Avisos, NECESSIDADES, type ParamsAviso } from "@/componentes/ui";
import { acaoAtualizarApoio, acaoSolicitarApoio } from "../acoes";

export const dynamic = "force-dynamic";

const NOME_NECESSIDADE = Object.fromEntries(NECESSIDADES) as Record<string, string>;

export default async function PaginaAcessibilidade({ searchParams }: { searchParams: ParamsAviso }) {
  const params = await searchParams;
  const [ativos, concluidos] = await Promise.all([
    db.atendimentoAcessibilidade.findMany({
      where: { status: { in: ["SOLICITADO", "EM_ATENDIMENTO"] } },
      include: { solicitadoPor: { select: { nome: true } }, atendidoPor: { select: { nome: true } } },
      orderBy: { criadoEm: "asc" },
    }),
    db.atendimentoAcessibilidade.findMany({
      where: { status: { in: ["CONCLUIDO", "CANCELADO"] }, criadoEm: { gte: horasAtras(24) } },
      include: { atendidoPor: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
    }),
  ]);

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Acessibilidade</h1>
          <div className="subtitulo">
            Apoio a pessoas com deficiência, idosos e gestantes. Pedidos novos avisam a recepção no horário e o encarregado de
            plantão pelo WhatsApp.
          </div>
        </div>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />

      <div className="cartao">
        <h2>Novo pedido de apoio</h2>
        <form action={acaoSolicitarApoio} className="formulario">
          <div className="campos">
            <label>
              Pessoa
              <input name="pessoa" required placeholder="Nome ou descrição" />
            </label>
            <label>
              Necessidade
              <select name="necessidade" defaultValue="IDOSO">
                {NECESSIDADES.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Destino
              <input name="destino" placeholder="Sala, loja, garagem…" />
            </label>
          </div>
          <label>
            Observação
            <input name="observacao" />
          </label>
          <div>
            <button type="submit">Registrar pedido</button>
          </div>
        </form>
      </div>

      <div className="cartao">
        <h2>Em aberto</h2>
        {ativos.length === 0 && <p className="suave">Nenhum atendimento em aberto.</p>}
        <table>
          <tbody>
            {ativos.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.pessoa}</strong> · {NOME_NECESSIDADE[a.necessidade]}
                  <div className="suave">
                    {a.destino ?? "destino não informado"} · pedido por {a.solicitadoPor.nome} às {formatarHora(a.criadoEm)}
                  </div>
                  {a.observacao && <div className="suave">{a.observacao}</div>}
                </td>
                <td>
                  {a.status === "SOLICITADO" ? (
                    <span className="selo alerta">Aguardando</span>
                  ) : (
                    <span className="selo info">Com {a.atendidoPor?.nome}</span>
                  )}
                </td>
                <td>
                  <div className="linha">
                    {a.status === "SOLICITADO" && (
                      <form action={acaoAtualizarApoio}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="EM_ATENDIMENTO" />
                        <button className="pequeno">Assumir</button>
                      </form>
                    )}
                    <form action={acaoAtualizarApoio}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value="CONCLUIDO" />
                      <button className="secundario pequeno">Concluir</button>
                    </form>
                    <form action={acaoAtualizarApoio}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value="CANCELADO" />
                      <button className="secundario pequeno">Cancelar</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {concluidos.length > 0 && (
        <div className="cartao">
          <h2>Últimas 24 horas</h2>
          <table>
            <tbody>
              {concluidos.map((a) => (
                <tr key={a.id}>
                  <td>{a.pessoa}</td>
                  <td>{NOME_NECESSIDADE[a.necessidade]}</td>
                  <td>{a.destino ?? "—"}</td>
                  <td>{a.status === "CONCLUIDO" ? <span className="selo ok">Concluído</span> : <span className="selo">Cancelado</span>}</td>
                  <td className="suave">
                    {a.atendidoPor?.nome} {a.concluidoEm && `· ${formatarDataHora(a.concluidoEm)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

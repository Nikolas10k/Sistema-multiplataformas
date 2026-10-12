import { db } from "@/lib/db";
import { situacaoRondas } from "@/lib/operacao";
import { formatarDataHora, formatarHora, nomeTurno, plantaoEm } from "@/lib/tempo";
import { Avisos, type ParamsAviso } from "@/componentes/ui";
import { acaoRegistrarRonda } from "../acoes";

export const dynamic = "force-dynamic";

const ROTULO = { OK: ["ok", "Feita"], PENDENTE: ["alerta", "Pendente"], ATRASADA: ["perigo", "Atrasada"], FECHADO: ["", "Fechado hoje"] } as const;

export default async function PaginaRondas({ searchParams }: { searchParams: ParamsAviso }) {
  const params = await searchParams;
  const p = plantaoEm();
  const [situacao, recentes] = await Promise.all([
    situacaoRondas(p),
    db.ronda.findMany({
      where: { realizadaEm: { gte: p.inicio } },
      include: { local: true, porteiro: { select: { nome: true } } },
      orderBy: { realizadaEm: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Rondas</h1>
          <div className="subtitulo">
            Plantão {nomeTurno(p.turno)} · início {formatarDataHora(p.inicio)}. Pelo WhatsApp basta mandar, por exemplo, &quot;ronda
            no 8º andar ok&quot;.
          </div>
        </div>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />

      <div className="cartao">
        <h2>Registrar ronda</h2>
        <form action={acaoRegistrarRonda} className="formulario">
          <div className="campos">
            <label>
              Local
              <select name="local" required>
                {situacao.map((s) => (
                  <option key={s.local.id} value={s.local.nome}>
                    {s.local.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Observação
              <input name="observacao" placeholder="Opcional" />
            </label>
          </div>
          <label className="checkbox">
            <input type="checkbox" name="com_alteracao" /> Encontrei alteração (registre também a ocorrência)
          </label>
          <div>
            <button type="submit">Registrar ronda</button>
          </div>
        </form>
      </div>

      <div className="grade grade-2">
        <div className="cartao">
          <h2>Checklist do plantão</h2>
          <table>
            <thead>
              <tr>
                <th>Local</th>
                <th>Situação</th>
                <th>Rondas</th>
                <th>Última</th>
              </tr>
            </thead>
            <tbody>
              {situacao.map((s) => (
                <tr key={s.local.id}>
                  <td>
                    {s.local.nome}
                    {s.local.intervaloRondaMin && <div className="suave">a cada {s.local.intervaloRondaMin} min</div>}
                  </td>
                  <td>
                    <span className={`selo ${ROTULO[s.situacao][0]}`}>{ROTULO[s.situacao][1]}</span>
                  </td>
                  <td>{s.quantidade}</td>
                  <td className="suave">{s.ultima ? formatarHora(s.ultima) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cartao">
          <h2>Últimas rondas</h2>
          {recentes.length === 0 && <p className="suave">Nenhuma ronda registrada neste plantão.</p>}
          <table>
            <tbody>
              {recentes.map((r) => (
                <tr key={r.id}>
                  <td className="suave">{formatarHora(r.realizadaEm)}</td>
                  <td>
                    {r.local.nome}
                    {r.observacao && <div className="suave">{r.observacao}</div>}
                  </td>
                  <td>{r.porteiro.nome}</td>
                  <td>{r.comAlteracao ? <span className="selo alerta">alteração</span> : <span className="selo ok">ok</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

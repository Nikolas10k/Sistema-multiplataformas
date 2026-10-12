import { db } from "@/lib/db";
import { formatarDataHora, formatarHora, horasAtras } from "@/lib/tempo";
import { Avisos } from "@/componentes/ui";
import { acaoConfirmarInvenzi, acaoRegistrarAcesso, acaoRegistrarSaida } from "../acoes";

export const dynamic = "force-dynamic";

type Params = Promise<{ ok?: string; erro?: string; busca?: string }>;

const TIPOS = { VISITANTE: "Visitante", PRESTADOR: "Prestador", ENTREGA: "Entrega", CANDIDATO: "Candidato", OUTRO: "Outro" };

export default async function PaginaAcessos({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const busca = params.busca?.trim();
  const [registros, recepcoes] = await Promise.all([
    db.registroAcesso.findMany({
      where: busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { sala: { contains: busca, mode: "insensitive" } },
              { empresa: { contains: busca, mode: "insensitive" } },
            ],
          }
        : { entradaEm: { gte: horasAtras(24) } },
      include: { local: true, registradoPor: { select: { nome: true } } },
      orderBy: { entradaEm: "desc" },
      take: 150,
    }),
    db.local.findMany({ where: { ativo: true, tipo: { in: ["RECEPCAO", "SUBSOLO"] } }, orderBy: { ordem: "asc" } }),
  ]);

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Controle de acesso</h1>
          <div className="subtitulo">
            Espelho operacional. O cadastro oficial continua no Invenzi: marque quando a pessoa já estiver cadastrada lá.
          </div>
        </div>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />

      <div className="cartao">
        <h2>Registrar entrada</h2>
        <form action={acaoRegistrarAcesso} className="formulario">
          <div className="campos">
            <label>
              Nome
              <input name="nome" required />
            </label>
            <label>
              Tipo
              <select name="tipo" defaultValue="VISITANTE">
                {Object.entries(TIPOS).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sala / loja
              <input name="sala" />
            </label>
            <label>
              Empresa
              <input name="empresa" />
            </label>
            <label>
              Documento (guardamos só os 4 últimos dígitos)
              <input name="documento" inputMode="numeric" autoComplete="off" />
            </label>
            <label>
              Entrada por
              <select name="local" defaultValue="">
                <option value="">—</option>
                {recepcoes.map((l) => (
                  <option key={l.id} value={l.nome}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Observação
            <input name="observacao" />
          </label>
          <label className="checkbox">
            <input type="checkbox" name="cadastrado_invenzi" defaultChecked /> Já cadastrado no Invenzi
          </label>
          <div>
            <button type="submit">Registrar entrada</button>
          </div>
        </form>
      </div>

      <div className="cartao">
        <form className="linha" method="get" style={{ marginBottom: 12 }}>
          <input name="busca" defaultValue={busca} placeholder="Buscar por nome, sala ou empresa" style={{ maxWidth: 360 }} />
          <button type="submit" className="secundario">
            Buscar
          </button>
          <span className="suave">{busca ? `Resultados para "${busca}"` : "Últimas 24 horas"}</span>
        </form>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Entrada</th>
                <th>Nome</th>
                <th>Destino</th>
                <th>Invenzi</th>
                <th>Saída</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="suave">{formatarDataHora(r.entradaEm)}</td>
                  <td>
                    {r.nome}
                    <div className="suave">
                      {TIPOS[r.tipo]}
                      {r.documentoFinal && ` · doc. final ${r.documentoFinal}`}
                      {r.local && ` · ${r.local.nome}`} · {r.registradoPor.nome}
                    </div>
                    {r.observacao && <div className="suave">{r.observacao}</div>}
                  </td>
                  <td>{[r.sala && `Sala ${r.sala}`, r.empresa].filter(Boolean).join(" · ") || "—"}</td>
                  <td>
                    {r.cadastradoInvenzi ? (
                      <span className="selo ok">ok</span>
                    ) : (
                      <form action={acaoConfirmarInvenzi}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="secundario pequeno" type="submit">
                          Confirmar
                        </button>
                      </form>
                    )}
                  </td>
                  <td>
                    {r.saidaEm ? (
                      <span className="suave">{formatarHora(r.saidaEm)}</span>
                    ) : (
                      <form action={acaoRegistrarSaida}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="pequeno" type="submit">
                          Registrar saída
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {registros.length === 0 && <p className="suave">Nenhum registro.</p>}
      </div>
    </div>
  );
}

import { db } from "@/lib/db";
import { exigirContexto } from "@/lib/auth";
import { formatarDataHora, formatarHora, horasAtras } from "@/lib/tempo";
import { Avisos } from "@/componentes/ui";
import { acaoConfirmarInvenzi, acaoRegistrarAcesso, acaoRegistrarSaida } from "../acoes";

export const dynamic = "force-dynamic";

type Params = Promise<{ ok?: string; erro?: string; busca?: string }>;

const TIPOS = { VISITANTE: "Visitante", PRESTADOR: "Prestador", ENTREGA: "Entrega", CANDIDATO: "Candidato", OUTRO: "Outro" };

export default async function PaginaAcessos({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const { condominio, relogio: r } = await exigirContexto();
  const busca = params.busca?.trim();
  const [registros, recepcoes] = await Promise.all([
    db.registroAcesso.findMany({
      where: busca
        ? {
            condominioId: condominio.id,
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { sala: { contains: busca, mode: "insensitive" } },
              { empresa: { contains: busca, mode: "insensitive" } },
            ],
          }
        : { condominioId: condominio.id, entradaEm: { gte: horasAtras(24) } },
      include: { local: true, registradoPor: { select: { nome: true } } },
      orderBy: { entradaEm: "desc" },
      take: 150,
    }),
    db.local.findMany({
      where: { condominioId: condominio.id, ativo: true, tipo: { in: ["RECEPCAO", "SUBSOLO"] } },
      orderBy: { ordem: "asc" },
    }),
  ]);

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Controle de acesso</h1>
          <div className="subtitulo">
            Espelho operacional. O cadastro oficial continua no sistema de controle de acesso do prédio: marque quando a pessoa
            já estiver cadastrada lá.
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
            <input type="checkbox" name="cadastrado_invenzi" defaultChecked /> Já cadastrado no sistema de acesso
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
                <th>Sistema de acesso</th>
                <th>Saída</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((a) => (
                <tr key={a.id}>
                  <td className="suave">{formatarDataHora(r, a.entradaEm)}</td>
                  <td>
                    {a.nome}
                    <div className="suave">
                      {TIPOS[a.tipo]}
                      {a.documentoFinal && ` · doc. final ${a.documentoFinal}`}
                      {a.local && ` · ${a.local.nome}`} · {a.registradoPor.nome}
                    </div>
                    {a.observacao && <div className="suave">{a.observacao}</div>}
                  </td>
                  <td>{[a.sala && `Sala ${a.sala}`, a.empresa].filter(Boolean).join(" · ") || "—"}</td>
                  <td>
                    {a.cadastradoInvenzi ? (
                      <span className="selo ok">ok</span>
                    ) : (
                      <form action={acaoConfirmarInvenzi}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="secundario pequeno" type="submit">
                          Confirmar
                        </button>
                      </form>
                    )}
                  </td>
                  <td>
                    {a.saidaEm ? (
                      <span className="suave">{formatarHora(r, a.saidaEm)}</span>
                    ) : (
                      <form action={acaoRegistrarSaida}>
                        <input type="hidden" name="id" value={a.id} />
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

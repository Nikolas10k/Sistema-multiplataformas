import Link from "next/link";
import { db } from "@/lib/db";
import { escalaAgora } from "@/lib/escala";
import { apoiosPendentes, situacaoRondas } from "@/lib/operacao";
import { NOME_SETOR } from "@/lib/permissoes";
import { formatarDataHora, formatarHora, nomeDiaSemana, nomeTurno, plantaoEm } from "@/lib/tempo";
import { SeloPrioridade, SeloStatus } from "@/componentes/ui";

export const dynamic = "force-dynamic";

export default async function PainelPlantao() {
  const agora = new Date();
  const inicioPlantao = plantaoEm(agora).inicio;
  const [{ plantao, equipes, recepcionistas }, rondas, abertas, noPredio, semInvenzi, apoios] = await Promise.all([
    escalaAgora(agora),
    situacaoRondas(undefined, agora),
    db.ocorrencia.findMany({
      where: { status: { in: ["ABERTA", "EM_ANDAMENTO"] } },
      include: { local: true },
      orderBy: [{ prioridade: "desc" }, { criadaEm: "asc" }],
      take: 10,
    }),
    db.registroAcesso.count({ where: { saidaEm: null, entradaEm: { gte: new Date(agora.getTime() - 24 * 3600_000) } } }),
    db.registroAcesso.count({ where: { cadastradoInvenzi: false, entradaEm: { gte: inicioPlantao } } }),
    apoiosPendentes(),
  ]);
  const totalAbertas = await db.ocorrencia.count({ where: { status: { in: ["ABERTA", "EM_ANDAMENTO"] } } });
  const rondasProblema = rondas.filter((r) => r.situacao === "ATRASADA" || r.situacao === "PENDENTE");
  const rondasOk = rondas.filter((r) => r.situacao === "OK").length;

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Plantão {nomeTurno(plantao.turno)}</h1>
          <div className="subtitulo">
            {formatarDataHora(agora)} · {nomeDiaSemana(agora)}
          </div>
        </div>
        <Link className="botao" href="/agente">
          Falar com o agente
        </Link>
      </div>

      <div className="grade grade-4">
        <div className="cartao">
          <div className="suave">Ocorrências abertas</div>
          <div className="numero-grande">{totalAbertas}</div>
        </div>
        <div className="cartao">
          <div className="suave">Rondas do plantão</div>
          <div className="numero-grande">
            {rondasOk}/{rondas.length}
          </div>
          <div className="suave">locais rondados</div>
        </div>
        <div className="cartao">
          <div className="suave">Pessoas no prédio (sem saída)</div>
          <div className="numero-grande">{noPredio}</div>
          {semInvenzi > 0 && <span className="selo alerta">{semInvenzi} sem confirmação no Invenzi</span>}
        </div>
        <div className="cartao">
          <div className="suave">Apoios de acessibilidade</div>
          <div className="numero-grande">{apoios.length}</div>
          <div className="suave">aguardando ou em andamento</div>
        </div>
      </div>

      <div className="grade grade-2">
        <div className="cartao">
          <h2>Escala agora</h2>
          {equipes.length === 0 && <p className="suave">Nenhuma equipe configurada para este plantão. Ajuste em Cadastros.</p>}
          {equipes.map((e) => (
            <div key={e.id} style={{ marginBottom: 10 }}>
              <strong>Equipe {e.nome}</strong>
              <div className="suave">
                Encarregado: {e.membros.filter((m) => m.papel === "ENCARREGADO").map((m) => m.nome).join(", ") || "—"}
              </div>
              <div className="suave">
                Porteiros: {e.membros.filter((m) => m.papel === "PORTEIRO").map((m) => m.nome).join(", ") || "—"}
              </div>
            </div>
          ))}
          <div>
            <strong>Recepção</strong>
            {recepcionistas.length ? (
              <div className="suave">{recepcionistas.map((r) => `${r.nome} (${r.horaInicio}–${r.horaFim})`).join(", ")}</div>
            ) : (
              <div>
                <span className="selo alerta">Recepção descoberta: portaria assume o acesso</span>
              </div>
            )}
          </div>
        </div>

        <div className="cartao">
          <div className="linha" style={{ justifyContent: "space-between" }}>
            <h2>Rondas pendentes</h2>
            <Link href="/rondas">ver checklist</Link>
          </div>
          {rondasProblema.length === 0 ? (
            <p className="suave">Tudo em dia.</p>
          ) : (
            <table>
              <tbody>
                {rondasProblema.slice(0, 10).map((r) => (
                  <tr key={r.local.id}>
                    <td>{r.local.nome}</td>
                    <td>
                      <span className={`selo ${r.situacao === "ATRASADA" ? "perigo" : "alerta"}`}>
                        {r.situacao === "ATRASADA" ? "Atrasada" : "Pendente"}
                      </span>
                    </td>
                    <td className="suave">{r.ultima ? `última ${formatarHora(r.ultima)}` : "sem ronda"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rondasProblema.length > 10 && <p className="suave">+ {rondasProblema.length - 10} locais</p>}
        </div>
      </div>

      <div className="cartao">
        <div className="linha" style={{ justifyContent: "space-between" }}>
          <h2>Ocorrências abertas</h2>
          <Link href="/ocorrencias">todas</Link>
        </div>
        {abertas.length === 0 ? (
          <p className="suave">Nenhuma ocorrência aberta.</p>
        ) : (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ocorrência</th>
                  <th>Prioridade</th>
                  <th>Setor</th>
                  <th>Status</th>
                  <th>Aberta em</th>
                </tr>
              </thead>
              <tbody>
                {abertas.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>
                      {o.titulo}
                      <div className="suave">{[o.local?.nome, o.sala && `sala ${o.sala}`].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td>
                      <SeloPrioridade p={o.prioridade} />
                    </td>
                    <td>{NOME_SETOR[o.setor]}</td>
                    <td>
                      <SeloStatus s={o.status} />
                    </td>
                    <td className="suave">{formatarDataHora(o.criadaEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {apoios.length > 0 && (
        <div className="cartao">
          <div className="linha" style={{ justifyContent: "space-between" }}>
            <h2>Acessibilidade</h2>
            <Link href="/acessibilidade">abrir</Link>
          </div>
          {apoios.map((a) => (
            <div key={a.id} className="linha" style={{ marginBottom: 6 }}>
              <span className={`selo ${a.status === "SOLICITADO" ? "alerta" : "info"}`}>
                {a.status === "SOLICITADO" ? "Aguardando" : "Em atendimento"}
              </span>
              <span>
                {a.pessoa} → {a.destino ?? "destino não informado"}
              </span>
              <span className="suave">desde {formatarHora(a.criadoEm)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

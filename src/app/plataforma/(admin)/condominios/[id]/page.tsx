import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { NOME_STATUS, situacaoAcesso } from "@/lib/condominio";
import { NOME_PAPEL } from "@/lib/permissoes";
import { dataDoBanco, formatarData, formatarDataHora, relogioDe } from "@/lib/tempo";
import { Avisos } from "@/componentes/ui";
import { alterarCondominio, cancelarCondominio, sincronizarCondominio } from "../../../acoes";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> };

export default async function DetalheCondominio({ params, searchParams }: Props) {
  const { id } = await params;
  const avisos = await searchParams;
  const c = await db.condominio.findUnique({ where: { id }, include: { plano: true } });
  if (!c) notFound();
  const r = relogioDe(c);
  const [planos, usuarios, usos, faturas, eventos, ocorrencias] = await Promise.all([
    db.plano.findMany({ orderBy: { ordem: "asc" } }),
    db.usuario.groupBy({ by: ["papel"], where: { condominioId: id, ativo: true }, _count: true }),
    db.usoMensal.findMany({ where: { condominioId: id }, orderBy: { mes: "desc" }, take: 6 }),
    db.fatura.findMany({ where: { condominioId: id }, orderBy: { vencimento: "desc" }, take: 12 }),
    db.eventoAuditoria.findMany({ where: { condominioId: id }, orderBy: { criadoEm: "desc" }, take: 30 }),
    db.ocorrencia.count({ where: { condominioId: id } }),
  ]);
  const acesso = situacaoAcesso(c);

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>{c.nome}</h1>
          <div className="subtitulo">
            {NOME_STATUS[c.status]} · {acesso.liberado ? "acesso liberado" : `bloqueado (${acesso.motivo})`} · criado em{" "}
            {formatarDataHora(r, c.criadoEm)}
          </div>
        </div>
      </div>
      <Avisos ok={avisos.ok} erro={avisos.erro} />

      <div className="grade grade-2">
        <div className="cartao">
          <h2>Dados</h2>
          <p>
            Responsável: {c.responsavelNome} · {c.responsavelEmail} {c.responsavelTelefone && `· ${c.responsavelTelefone}`}
          </p>
          <p>Tipo: {c.tipo.toLowerCase()} · CPF/CNPJ cobrança: {c.cpfCnpjCobranca ?? "—"}</p>
          <p>
            Turnos: {c.horaInicioDia} / {c.horaInicioNoite} · {c.fuso}
          </p>
          <p>WhatsApp: {c.whatsappNumeroExibicao ?? c.whatsappPhoneNumberId ?? "não conectado"}</p>
          <p>
            Asaas: cliente {c.asaasCustomerId ?? "—"} · assinatura {c.asaasSubscriptionId ?? "—"}
          </p>
          <p>
            Usuários ativos: {usuarios.map((u) => `${NOME_PAPEL[u.papel]} ${u._count}`).join(" · ") || "nenhum"} · Ocorrências:{" "}
            {ocorrencias}
          </p>
        </div>

        <div className="cartao">
          <h2>Gerenciar</h2>
          <form action={alterarCondominio} className="formulario">
            <input type="hidden" name="id" value={c.id} />
            <div className="campos">
              <label>
                Status
                <select name="status" defaultValue={c.status}>
                  {Object.entries(NOME_STATUS).map(([v, n]) => (
                    <option key={v} value={v}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Plano
                <select name="planoId" defaultValue={c.planoId ?? ""}>
                  <option value="">—</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({moeda.format(Number(p.precoMensal))})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estender teste (dias)
                <input name="diasTeste" type="number" min={0} max={90} defaultValue={0} />
              </label>
            </div>
            <p className="suave">
              Teste até: {c.testeAte ? formatarDataHora(r, c.testeAte) : "—"}. Mudar o plano aqui não altera a cobrança no Asaas.
            </p>
            <div>
              <button type="submit">Salvar</button>
            </div>
          </form>
          <div className="linha" style={{ marginTop: 12 }}>
            <form action={sincronizarCondominio}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="secundario pequeno">
                Sincronizar faturas
              </button>
            </form>
            {c.status !== "CANCELADO" && (
              <form action={cancelarCondominio}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="perigo pequeno">
                  Cancelar assinatura
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grade grade-2">
        <div className="cartao">
          <h2>Consumo do agente</h2>
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Mensagens</th>
                <th>Tokens entrada</th>
                <th>Tokens saída</th>
                <th>Cache</th>
              </tr>
            </thead>
            <tbody>
              {usos.map((u) => (
                <tr key={u.mes}>
                  <td>{u.mes}</td>
                  <td>{u.mensagens}</td>
                  <td>{u.tokensEntrada.toLocaleString("pt-BR")}</td>
                  <td>{u.tokensSaida.toLocaleString("pt-BR")}</td>
                  <td>{u.tokensCache.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {usos.length === 0 && <p className="suave">Sem uso registrado.</p>}
        </div>
        <div className="cartao">
          <h2>Faturas</h2>
          <table>
            <tbody>
              {faturas.map((f) => (
                <tr key={f.id}>
                  <td>{formatarData(dataDoBanco(f.vencimento))}</td>
                  <td>{moeda.format(Number(f.valor))}</td>
                  <td>{f.status}</td>
                  <td>{f.linkFatura && <a href={f.linkFatura} target="_blank" rel="noreferrer">abrir</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {faturas.length === 0 && <p className="suave">Nenhuma fatura.</p>}
        </div>
      </div>

      <div className="cartao">
        <h2>Auditoria</h2>
        <table>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id}>
                <td className="suave">{formatarDataHora(r, e.criadoEm)}</td>
                <td>{e.acao}</td>
                <td>{e.autor}</td>
                <td className="suave">{e.detalhes ? JSON.stringify(e.detalhes).slice(0, 140) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

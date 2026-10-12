import { redirect } from "next/navigation";
import { exigirContexto } from "@/lib/auth";
import { db } from "@/lib/db";
import { NOME_STATUS } from "@/lib/condominio";
import { podeAdministrarSistema } from "@/lib/permissoes";
import { asaasConfigurado } from "@/lib/cobranca/asaas";
import { dataDoBanco, formatarData, formatarDataHora, mesAtual } from "@/lib/tempo";
import { Avisos, type ParamsAviso } from "@/componentes/ui";
import { BotaoEnviar } from "@/componentes/BotaoEnviar";
import { atualizarFaturas, contratarPlano } from "./acoes";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_FATURA: Record<string, [string, string]> = {
  PENDING: ["alerta", "Aguardando pagamento"],
  RECEIVED: ["ok", "Paga"],
  CONFIRMED: ["ok", "Paga (compensando)"],
  RECEIVED_IN_CASH: ["ok", "Paga"],
  OVERDUE: ["perigo", "Vencida"],
  REFUNDED: ["", "Estornada"],
};

const MOTIVO: Record<string, string> = {
  TESTE_EXPIRADO: "O período de teste terminou.",
  INADIMPLENTE: "Há fatura vencida além do prazo de carência.",
  SUSPENSO: "O acesso está suspenso.",
  CANCELADO: "A assinatura foi cancelada.",
};

export default async function PaginaAssinatura({ searchParams }: { searchParams: ParamsAviso }) {
  const { usuario, condominio: c, relogio: r, acesso } = await exigirContexto({ permitirBloqueado: true });
  const params = await searchParams;
  const gestor = podeAdministrarSistema(usuario.papel);

  if (!gestor) {
    if (acesso.liberado) redirect("/");
    return (
      <div className="cartao">
        <h1>Acesso suspenso</h1>
        <p>{acesso.motivo ? MOTIVO[acesso.motivo] : ""} Avise a administração do condomínio para regularizar a assinatura.</p>
        <p className="suave">Enquanto isso, registre as ocorrências no livro físico.</p>
      </div>
    );
  }

  const [planos, faturas, uso, usuariosAtivos] = await Promise.all([
    db.plano.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } }),
    db.fatura.findMany({ where: { condominioId: c.id }, orderBy: { vencimento: "desc" }, take: 12 }),
    db.usoMensal.findUnique({ where: { condominioId_mes: { condominioId: c.id, mes: mesAtual(r) } } }),
    db.usuario.count({ where: { condominioId: c.id, ativo: true } }),
  ]);
  const plano = planos.find((p) => p.id === c.planoId) ?? (c.planoId ? await db.plano.findUnique({ where: { id: c.planoId } }) : null);
  const cobranca = asaasConfigurado();

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Assinatura</h1>
          <div className="subtitulo">Plano, consumo e faturas do condomínio.</div>
        </div>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />
      {!acesso.liberado && acesso.motivo && (
        <div className="aviso erro">
          {MOTIVO[acesso.motivo]} Contrate ou regularize o plano abaixo para liberar o sistema. Seus dados estão preservados.
        </div>
      )}

      <div className="grade grade-4">
        <div className="cartao">
          <div className="suave">Situação</div>
          <div className="numero-grande" style={{ fontSize: "1.4rem" }}>
            {NOME_STATUS[c.status]}
          </div>
          {c.status === "TESTE" && c.testeAte && <div className="suave">até {formatarDataHora(r, c.testeAte)}</div>}
        </div>
        <div className="cartao">
          <div className="suave">Plano</div>
          <div className="numero-grande" style={{ fontSize: "1.4rem" }}>
            {plano?.nome ?? "—"}
          </div>
          {plano && <div className="suave">{moeda.format(Number(plano.precoMensal))}/mês</div>}
        </div>
        <div className="cartao">
          <div className="suave">Mensagens do agente no mês</div>
          <div className="numero-grande" style={{ fontSize: "1.4rem" }}>
            {uso?.mensagens ?? 0}
            {plano?.maxMensagensMes ? ` / ${plano.maxMensagensMes}` : ""}
          </div>
        </div>
        <div className="cartao">
          <div className="suave">Usuários ativos</div>
          <div className="numero-grande" style={{ fontSize: "1.4rem" }}>
            {usuariosAtivos}
            {plano?.maxUsuarios ? ` / ${plano.maxUsuarios}` : ""}
          </div>
        </div>
      </div>

      <div className="cartao">
        <h2>{c.asaasSubscriptionId ? "Trocar de plano" : "Contratar plano"}</h2>
        {!cobranca ? (
          <p className="suave">A cobrança automática ainda não está habilitada. Fale com o suporte para contratar.</p>
        ) : (
          <form action={contratarPlano} className="formulario">
            <div className="grade grade-4" style={{ marginBottom: 8 }}>
              {planos.map((p) => (
                <label key={p.id} className="cartao" style={{ cursor: "pointer", color: "var(--texto)" }}>
                  <span className="linha">
                    <input type="radio" name="planoId" value={p.id} defaultChecked={p.id === (plano?.id ?? planos[0]?.id)} required />
                    <strong>{p.nome}</strong>
                  </span>
                  <span className="numero-grande" style={{ fontSize: "1.3rem" }}>
                    {moeda.format(Number(p.precoMensal))}
                    <span className="suave">/mês</span>
                  </span>
                  <span className="suave">{p.descricao}</span>
                </label>
              ))}
            </div>
            <div className="campos">
              <label>
                Forma de pagamento
                <select name="forma" defaultValue="UNDEFINED">
                  <option value="UNDEFINED">Cliente escolhe na fatura (boleto, Pix ou cartão)</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="PIX">Pix</option>
                  <option value="CREDIT_CARD">Cartão de crédito</option>
                </select>
              </label>
              <label>
                CPF/CNPJ do pagador
                <input name="cpfCnpj" defaultValue={c.cpfCnpjCobranca ?? ""} inputMode="numeric" required={!c.cpfCnpjCobranca} />
              </label>
            </div>
            <p className="suave">
              {c.status === "TESTE"
                ? "A primeira fatura vence no fim do período de teste."
                : "A primeira fatura vence amanhã. A fatura é enviada por e-mail ao responsável."}
            </p>
            <div>
              <BotaoEnviar texto={c.asaasSubscriptionId ? "Trocar plano" : "Assinar"} pendente="Processando…" />
            </div>
          </form>
        )}
      </div>

      <div className="cartao">
        <div className="linha" style={{ justifyContent: "space-between" }}>
          <h2>Faturas</h2>
          {c.asaasSubscriptionId && (
            <form action={atualizarFaturas}>
              <button type="submit" className="secundario pequeno">
                Atualizar
              </button>
            </form>
          )}
        </div>
        {faturas.length === 0 ? (
          <p className="suave">Nenhuma fatura ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {faturas.map((fa) => {
                const [classe, nome] = STATUS_FATURA[fa.status] ?? ["", fa.status];
                return (
                  <tr key={fa.id}>
                    <td>{formatarData(dataDoBanco(fa.vencimento))}</td>
                    <td>{moeda.format(Number(fa.valor))}</td>
                    <td>
                      <span className={`selo ${classe}`}>{nome}</span>
                    </td>
                    <td>
                      {fa.linkFatura && (
                        <a href={fa.linkFatura} target="_blank" rel="noreferrer">
                          {classe === "ok" ? "Comprovante" : "Pagar"}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

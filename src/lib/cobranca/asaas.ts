// Cliente mínimo da API do Asaas (v3). Docs: https://docs.asaas.com
// A chave vai no header `access_token`; sandbox e produção têm URLs e chaves diferentes.

export class ErroAsaas extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

export function asaasConfigurado(): boolean {
  return Boolean(process.env.ASAAS_API_KEY);
}

function urlBase() {
  if (process.env.ASAAS_URL_BASE) return process.env.ASAAS_URL_BASE; // testes / proxy
  return process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

async function chamar<T>(metodo: "GET" | "POST" | "DELETE", caminho: string, corpo?: unknown): Promise<T> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new ErroAsaas("Cobrança não configurada (ASAAS_API_KEY).", 0);
  const resp = await fetch(`${urlBase()}${caminho}`, {
    method: metodo,
    headers: {
      access_token: chave,
      "Content-Type": "application/json",
      "User-Agent": process.env.NOME_PRODUTO || "Givance Condominio",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resp.text();
  const json = texto ? JSON.parse(texto) : {};
  if (!resp.ok) {
    const erros = (json as { errors?: { description: string }[] }).errors;
    throw new ErroAsaas(erros?.map((e) => e.description).join("; ") || `Asaas respondeu ${resp.status}`, resp.status);
  }
  return json as T;
}

export type FormaPagamento = "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED";

export type CobrancaAsaas = {
  id: string;
  subscription?: string;
  customer: string;
  value: number;
  status: string;
  dueDate: string;
  invoiceUrl?: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  externalReference?: string | null;
};

export function criarCliente(dados: { nome: string; cpfCnpj: string; email: string; telefone?: string | null; referencia: string }) {
  return chamar<{ id: string }>("POST", "/customers", {
    name: dados.nome,
    cpfCnpj: dados.cpfCnpj,
    email: dados.email,
    mobilePhone: dados.telefone ?? undefined,
    externalReference: dados.referencia,
    notificationDisabled: false,
  });
}

export function criarAssinatura(dados: {
  cliente: string;
  valor: number;
  forma: FormaPagamento;
  primeiroVencimento: string; // AAAA-MM-DD
  descricao: string;
  referencia: string;
}) {
  return chamar<{ id: string }>("POST", "/subscriptions", {
    customer: dados.cliente,
    billingType: dados.forma,
    value: dados.valor,
    nextDueDate: dados.primeiroVencimento,
    cycle: "MONTHLY",
    description: dados.descricao,
    externalReference: dados.referencia,
  });
}

/** Altera valor/forma da assinatura; `atualizarCobrancasPendentes` aplica também às faturas já geradas. */
export function atualizarAssinatura(id: string, dados: { valor: number; forma: FormaPagamento; descricao: string }) {
  return chamar<{ id: string }>("POST", `/subscriptions/${id}`, {
    value: dados.valor,
    billingType: dados.forma,
    description: dados.descricao,
    updatePendingPayments: true,
  });
}

export function cancelarAssinatura(id: string) {
  return chamar<{ deleted: boolean }>("DELETE", `/subscriptions/${id}`);
}

export async function cobrancasDaAssinatura(id: string): Promise<CobrancaAsaas[]> {
  const r = await chamar<{ data: CobrancaAsaas[] }>("GET", `/subscriptions/${id}/payments?limit=24`);
  return r.data;
}

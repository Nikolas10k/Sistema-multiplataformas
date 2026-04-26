"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Printer, CheckCircle2, XCircle, DollarSign,
  Package, Clock, Receipt, User, CreditCard, FileText,
  QrCode, Banknote, BadgeCheck, Building2, Phone, FileDigit
} from "lucide-react";
import { registerPayment, cancelSale, incrementSessionUsed } from "@/actions/sales";

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: any }> = {
  PENDING:   { label: "Pendente",  cls: "text-warning bg-warning-bg border-warning",   icon: Clock        },
  PARTIAL:   { label: "Parcial",   cls: "text-info bg-info-bg border-info",            icon: DollarSign   },
  PAID:      { label: "Pago",      cls: "text-success bg-success-bg border-success",   icon: CheckCircle2 },
  CANCELLED: { label: "Cancelado", cls: "text-danger bg-danger-bg border-danger",      icon: XCircle      },
};

const PAYMENT_LABEL: Record<string, string> = {
  PIX: "PIX", CREDITO: "Cartão de Crédito", DEBITO: "Cartão de Débito",
  DINHEIRO: "Dinheiro", CONVENIO: "Convênio",
};

export default function SaleDetail({ sale, context }: { sale: any; context: any }) {
  const router = useRouter();
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [loadingPay, setLoadingPay] = useState(false);

  const statusInfo = STATUS_STYLE[sale.status] ?? { label: sale.status, cls: "text-muted border-border", icon: Receipt };
  const StatusIcon = statusInfo.icon;
  const pending = sale.total - sale.amountPaid;

  const handlePay = async () => {
    if (!payAmount) return;
    setLoadingPay(true);
    await registerPayment(sale.id, parseFloat(payAmount));
    setLoadingPay(false);
    setPayModal(false);
    router.refresh();
  };

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar esta venda?")) return;
    await cancelSale(sale.id);
    router.push("/admin/vendas");
  };

  const handleUseSession = async (itemId: string) => {
    const res = await incrementSessionUsed(itemId);
    if (!res.success) alert(res.message);
    else router.refresh();
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Payment Modal */}
      {payModal && (
        <div className="modal-overlay flex-center" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(10,10,15,0.85)", zIndex: 1000, backdropFilter: "blur(10px)" }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: 400 }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3">Registrar Pagamento</h2>
              <button className="btn-circle btn-sm" onClick={() => setPayModal(false)}>
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted">Pendente: <strong className="text-danger">{fmt(pending)}</strong></p>
              <div className="input-group">
                <label className="input-label">Valor recebido (R$)</label>
                <input type="number" step="0.01" max={pending} className="input-field" value={payAmount}
                  onChange={e => setPayAmount(e.target.value)} placeholder="0,00" autoFocus />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => setPayAmount(pending.toFixed(2))}>Total ({fmt(pending)})</button>
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => setPayAmount((pending / 2).toFixed(2))}>50%</button>
              </div>
            </div>
            <div className="p-6 border-top bg-bg-surface flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setPayModal(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={handlePay} disabled={loadingPay}>
                {loadingPay ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-between mb-8">
        <div className="flex items-center gap-4">
          <button className="btn-circle btn-sm border border-border" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-h1">Venda #{sale.saleNumber.toString().padStart(4, "0")}</h1>
            <p className="text-sm text-muted">{new Date(sale.saleDate).toLocaleString("pt-BR")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={18} /> Imprimir
          </button>
          {sale.status !== "PAID" && sale.status !== "CANCELLED" && (
            <>
              <button className="btn btn-primary" onClick={() => { setPayAmount(pending.toFixed(2)); setPayModal(true); }}>
                <DollarSign size={18} /> Registrar Pagamento
              </button>
              <button className="btn btn-secondary text-danger border-danger" onClick={handleCancel}>
                <XCircle size={18} /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-xl border mb-6 flex items-center gap-3 ${statusInfo.cls}`}>
        <StatusIcon size={22} />
        <div>
          <p className="font-bold text-lg">{statusInfo.label}</p>
          {pending > 0 && sale.status !== "CANCELLED" && (
            <p className="text-sm opacity-80">Saldo pendente: <strong>{fmt(pending)}</strong></p>
          )}
        </div>
      </div>

      <div className="grid-2 mb-6" style={{ gap: "1.5rem" }}>
        {/* Patient Info */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <User size={14} /> Paciente
          </h3>
          <p className="font-semibold text-lg">{sale.patient.name}</p>
          {sale.patient.phone && (
            <p className="text-sm text-muted flex items-center gap-2 mt-1"><Phone size={13} /> {sale.patient.phone}</p>
          )}
          {sale.patient.document && (
            <p className="text-sm text-muted flex items-center gap-2 mt-1"><FileDigit size={13} /> {sale.patient.document}</p>
          )}
          <span className="badge badge-neutral mt-3">{sale.attendanceType}</span>
        </div>

        {/* Payment Info */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <CreditCard size={14} /> Pagamento
          </h3>
          <div className="space-y-2">
            <div className="flex-between text-sm">
              <span className="text-muted">Forma</span>
              <span className="font-medium">{PAYMENT_LABEL[sale.paymentMethod ?? ""] ?? "—"}</span>
            </div>
            <div className="flex-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>{fmt(sale.subtotal)}</span>
            </div>
            {sale.discountValue > 0 && (
              <div className="flex-between text-sm text-success">
                <span>Desconto</span>
                <span>-{fmt(sale.discountValue)}</span>
              </div>
            )}
            <div className="flex-between font-bold text-xl pt-2 border-top">
              <span>Total</span>
              <span className="text-accent">{fmt(sale.total)}</span>
            </div>
            <div className="flex-between text-sm text-success">
              <span>Pago</span>
              <span className="font-medium">{fmt(sale.amountPaid)}</span>
            </div>
            {pending > 0 && (
              <div className="flex-between text-sm text-danger font-medium">
                <span>Pendente</span>
                <span>{fmt(pending)}</span>
              </div>
            )}
            {sale.dueDate && (
              <div className="flex-between text-xs text-muted pt-1">
                <span>Vencimento</span>
                <span>{new Date(sale.dueDate).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card mb-6">
        <div className="p-6 border-bottom">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
            <Package size={14} /> Itens da Venda
          </h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Tipo</th>
                <th className="text-center">Qtd</th>
                <th className="text-center">Sessões</th>
                <th>Valor Unit.</th>
                <th>Desconto</th>
                <th>Total</th>
                {sale.status === "PAID" && <th className="text-center">Usar Sessão</th>}
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <p className="font-medium">{item.service.name}</p>
                    {item.expiresAt && (
                      <p className="text-xs text-muted">Vence: {new Date(item.expiresAt).toLocaleDateString("pt-BR")}</p>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${item.service.type === "PACOTE" ? "badge-accent" : "badge-info"}`}>
                      {item.service.type}
                    </span>
                  </td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-center">
                    {item.sessionsTotal > 1 ? (
                      <div>
                        <span className="font-medium">{item.sessionsUsed}</span>
                        <span className="text-muted"> / {item.sessionsTotal}</span>
                        <div className="w-16 h-1 bg-bg-muted rounded-full mt-1 mx-auto overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${(item.sessionsUsed / item.sessionsTotal) * 100}%` }} />
                        </div>
                      </div>
                    ) : "—"}
                  </td>
                  <td>{fmt(item.unitPrice)}</td>
                  <td>{item.discountItem > 0 ? `-${fmt(item.discountItem)}` : "—"}</td>
                  <td className="font-semibold">{fmt(item.totalItem)}</td>
                  {sale.status === "PAID" && (
                    <td className="text-center">
                      {item.sessionsTotal > 1 && item.sessionsUsed < item.sessionsTotal ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUseSession(item.id)}>
                          Registrar
                        </button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {sale.notes && (
        <div className="card p-6">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
            <FileText size={14} /> Observações
          </h3>
          <p className="text-sm">{sale.notes}</p>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .btn, button, .topbar, .sidebar, aside { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          body { background: white !important; color: black !important; }
          * { color: black !important; }
        }
      `}</style>
    </div>
  );
}

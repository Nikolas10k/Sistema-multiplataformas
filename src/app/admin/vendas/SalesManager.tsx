"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag, Plus, Search, Filter, TrendingUp, DollarSign,
  Clock, CheckCircle2, XCircle, ChevronRight, Eye, Receipt,
  AlertCircle, CreditCard, Banknote, QrCode, BadgeCheck, Printer
} from "lucide-react";
import { getSales, getSalesSummary, registerPayment, cancelSale } from "@/actions/sales";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  PENDING:   { label: "Pendente",   badge: "badge-warning" },
  PARTIAL:   { label: "Parcial",    badge: "badge-info"    },
  PAID:      { label: "Pago",       badge: "badge-success" },
  CANCELLED: { label: "Cancelado",  badge: "badge-danger"  },
};

const PAYMENT_MAP: Record<string, { label: string; icon: any }> = {
  PIX:      { label: "PIX",         icon: QrCode   },
  CREDITO:  { label: "Crédito",     icon: CreditCard },
  DEBITO:   { label: "Débito",      icon: CreditCard },
  DINHEIRO: { label: "Dinheiro",    icon: Banknote  },
  CONVENIO: { label: "Convênio",    icon: BadgeCheck },
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function SalesManager() {
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalValue: 0, paidValue: 0, pendingValue: 0, monthCount: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [fPatient,  setFPatient]  = useState("");
  const [fStatus,   setFStatus]   = useState("");
  const [fPayment,  setFPayment]  = useState("");
  const [fFromDate, setFFromDate] = useState("");
  const [fToDate,   setFToDate]   = useState("");

  // Payment modal
  const [payModal, setPayModal] = useState<{ id: string; remaining: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [saleList, sumData] = await Promise.all([
      getSales({ patientName: fPatient, status: fStatus, paymentMethod: fPayment, fromDate: fFromDate, toDate: fToDate }),
      getSalesSummary(),
    ]);
    setSales(saleList);
    setSummary(sumData);
    setLoading(false);
  }, [fPatient, fStatus, fPayment, fFromDate, fToDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePay = async () => {
    if (!payModal) return;
    const amount = Math.min(parseFloat(payAmount) || 0, payModal.remaining);
    if (amount <= 0) return;
    await registerPayment(payModal.id, amount);
    setPayModal(null);
    setPayAmount("");
    fetchData();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta venda?")) return;
    await cancelSale(id);
    fetchData();
  };

  return (
    <div className="animate-fade-in">
      {/* ─── Payment Modal ─── */}
      {payModal && (
        <div className="modal-overlay flex-center" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(10,10,15,0.85)", zIndex: 1000, backdropFilter: "blur(10px)" }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: 420 }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3 flex items-center gap-2"><DollarSign size={20} className="text-success" /> Registrar Pagamento</h2>
              <button className="btn-circle btn-sm" onClick={() => { setPayModal(null); setPayAmount(""); }}>
                <Plus size={18} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted">Saldo pendente: <strong className="text-danger">{fmt(payModal.remaining)}</strong></p>
              <div className="input-group">
                <label className="input-label">Valor recebido (R$)</label>
                <input
                  type="number" step="0.01" max={payModal.remaining}
                  className="input-field" value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                {[payModal.remaining, payModal.remaining / 2, payModal.remaining / 4].map(v => (
                  <button key={v} className="btn btn-secondary btn-sm flex-1" onClick={() => setPayAmount(v.toFixed(2))}>
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 border-top bg-bg-surface flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => { setPayModal(null); setPayAmount(""); }}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={handlePay}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Receipt size={32} className="text-accent" />
            Vendas e Cobranças
          </h1>
          <p className="text-muted">Gestão financeira de serviços e pacotes de atendimento.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/vendas/servicos" className="btn btn-secondary">
            <ShoppingBag size={18} /> Catálogo
          </Link>
          <Link href="/admin/vendas/nova" className="btn btn-primary">
            <Plus size={18} /> Nova Venda
          </Link>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid-4 mb-8">
        {[
          { label: "Total Gerado",   value: fmt(summary.totalValue),   icon: TrendingUp,   color: "primary" },
          { label: "Total Recebido", value: fmt(summary.paidValue),    icon: CheckCircle2, color: "success" },
          { label: "A Receber",      value: fmt(summary.pendingValue), icon: Clock,         color: "warning" },
          { label: "Vendas no Mês",  value: String(summary.monthCount), icon: ShoppingBag,  color: "info"    },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card stat-card">
            <div className="stat-header">
              <div>
                <p className="stat-label">{label}</p>
                <p className="stat-value">{value}</p>
              </div>
              <div className={`stat-icon-wrap ${color}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Filters ─── */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="input-group" style={{ minWidth: 200, flex: 1 }}>
            <label className="input-label">Paciente</label>
            <div className="input-wrapper">
              <Search size={14} className="input-icon" />
              <input className="input-field input-sm with-icon" placeholder="Buscar paciente..." value={fPatient} onChange={e => setFPatient(e.target.value)} />
            </div>
          </div>
          <div className="input-group" style={{ minWidth: 140 }}>
            <label className="input-label">Status</label>
            <select className="input-field input-sm" value={fStatus} onChange={e => setFStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="PARTIAL">Parcial</option>
              <option value="PAID">Pago</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div className="input-group" style={{ minWidth: 140 }}>
            <label className="input-label">Pagamento</label>
            <select className="input-field input-sm" value={fPayment} onChange={e => setFPayment(e.target.value)}>
              <option value="">Todos</option>
              <option value="PIX">PIX</option>
              <option value="CREDITO">Crédito</option>
              <option value="DEBITO">Débito</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CONVENIO">Convênio</option>
            </select>
          </div>
          <div className="input-group" style={{ minWidth: 140 }}>
            <label className="input-label">De</label>
            <input type="date" className="input-field input-sm" value={fFromDate} onChange={e => setFFromDate(e.target.value)} />
          </div>
          <div className="input-group" style={{ minWidth: 140 }}>
            <label className="input-label">Até</label>
            <input type="date" className="input-field input-sm" value={fToDate} onChange={e => setFToDate(e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setFPatient(""); setFStatus(""); setFPayment(""); setFFromDate(""); setFToDate(""); }}>
            Limpar
          </button>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-muted">Carregando vendas...</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Paciente</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Pendente</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => {
                  const pending = s.total - s.amountPaid;
                  const status  = STATUS_MAP[s.status] ?? { label: s.status, badge: "badge-neutral" };
                  const pay     = PAYMENT_MAP[s.paymentMethod ?? ""] ?? null;
                  return (
                    <tr key={s.id}>
                      <td className="font-bold text-accent">#{s.saleNumber.toString().padStart(4, "0")}</td>
                      <td>
                        <div>
                          <p className="font-medium">{s.patient.name}</p>
                          {s.patient.phone && <p className="text-xs text-muted">{s.patient.phone}</p>}
                        </div>
                      </td>
                      <td className="text-sm text-muted">
                        {s.items.slice(0, 2).map((i: any) => i.service.name).join(", ")}
                        {s.items.length > 2 && <span className="text-xs"> +{s.items.length - 2}</span>}
                      </td>
                      <td className="font-semibold">{fmt(s.total)}</td>
                      <td className="text-success font-medium">{fmt(s.amountPaid)}</td>
                      <td className={pending > 0 ? "text-danger font-medium" : "text-muted"}>{fmt(pending)}</td>
                      <td>
                        {pay ? (
                          <span className="flex items-center gap-1 text-sm">
                            <pay.icon size={14} className="text-muted" /> {pay.label}
                          </span>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </td>
                      <td><span className={`badge ${status.badge}`}>{status.label}</span></td>
                      <td className="text-sm text-muted">{new Date(s.saleDate).toLocaleDateString("pt-BR")}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/vendas/${s.id}`} className="btn-icon" title="Ver nota">
                            <Eye size={16} />
                          </Link>
                          {s.status !== "PAID" && s.status !== "CANCELLED" && (
                            <button className="btn-icon text-success" title="Registrar pagamento"
                              onClick={() => setPayModal({ id: s.id, remaining: pending })}>
                              <DollarSign size={16} />
                            </button>
                          )}
                          {s.status !== "CANCELLED" && s.status !== "PAID" && (
                            <button className="btn-icon text-danger" title="Cancelar" onClick={() => handleCancel(s.id)}>
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-bg-muted rounded-full flex-center mx-auto mb-4 opacity-30">
                  <Receipt size={32} />
                </div>
                <h3 className="text-h3 text-muted">Nenhuma venda encontrada</h3>
                <p className="text-sm text-muted mb-6">Crie uma nova venda para começar a controlar os recebimentos.</p>
                <Link href="/admin/vendas/nova" className="btn btn-primary">
                  <Plus size={18} /> Nova Venda
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

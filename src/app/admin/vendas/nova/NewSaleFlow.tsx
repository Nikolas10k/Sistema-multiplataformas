"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, User, ShoppingBag, CreditCard, CheckCircle2,
  Plus, Trash2, Search, AlertCircle, Receipt, ChevronLeft,
  QrCode, Banknote, BadgeCheck, Tag, Package
} from "lucide-react";
import { getPatients } from "@/actions/clinical";
import { getServices, createSale } from "@/actions/sales";
import { getProductsAndCategories } from "@/actions/products";

const STEPS = ["Paciente", "Itens", "Pagamento"];

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

interface CartItem {
  item: any; // Can be Service or Product
  type: 'SERVICE' | 'PRODUCT';
  quantity: number;
  unitPrice: number;
  discountItem: number;
}

export default function NewSaleFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [patients,  setPatients]  = useState<any[]>([]);
  const [catalog,   setCatalog]   = useState<any[]>([]);

  // Step 1 – Patient
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [attendanceType, setAttendanceType] = useState("PARTICULAR");

  // Step 2 – Cart
  const [itemSearch, setItemSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState("");

  // Step 3 – Payment
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([getPatients(), getServices(), getProductsAndCategories()]).then(([p, s, prodData]) => {
      setPatients(p);
      
      const servicesFormatted = s.filter((sv: any) => sv.active).map((sv: any) => ({
        ...sv,
        catalogType: 'SERVICE'
      }));

      const productsFormatted = prodData.products.map((pr: any) => ({
        ...pr,
        catalogType: 'PRODUCT',
        category: pr.category || 'Materiais'
      }));

      setCatalog([...servicesFormatted, ...productsFormatted]);
    });
  }, []);

  // ── Computed ──
  const subtotal = cart.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity - item.discountItem, 0
  );
  const discountValue = parseFloat(discountTotal) || 0;
  const total = Math.max(0, subtotal - discountValue);
  const paid = parseFloat(amountPaid) || 0;
  const pending = Math.max(0, total - paid);
  const saleStatus = paid >= total ? "PAGO" : paid > 0 ? "PARCIAL" : "PENDENTE";

  // ── Cart helpers ──
  const addToCart = (item: any) => {
    const exists = cart.find(i => i.item.id === item.id);
    if (exists) {
      setCart(cart.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { 
        item, 
        type: item.catalogType,
        quantity: 1, 
        unitPrice: item.price, 
        discountItem: 0 
      }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(i => i.item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof CartItem, value: any) => {
    setCart(cart.map(i => i.item.id === itemId ? { ...i, [field]: value } : i));
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!selectedPatient || cart.length === 0) return;
    setSubmitting(true);
    const res = await createSale({
      patientId: selectedPatient.id,
      attendanceType,
      paymentMethod,
      notes,
      discountValue,
      amountPaid: paid,
      dueDate: dueDate || undefined,
      items: cart.map(cartItem => ({
        serviceId: cartItem.type === 'SERVICE' ? cartItem.item.id : null,
        productId: cartItem.type === 'PRODUCT' ? cartItem.item.id : null,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        discountItem: cartItem.discountItem,
        sessionsTotal: cartItem.type === 'SERVICE' ? (cartItem.item.sessions || 1) * cartItem.quantity : 0,
      })),
    });
    setSubmitting(false);
    if (res.success && res.sale) {
      router.push(`/admin/vendas/${res.sale.id}`);
    } else {
      alert(res.message ?? "Erro ao criar venda");
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phone && p.phone.includes(patientSearch)) ||
    (p.document && p.document.includes(patientSearch))
  );

  const filteredCatalog = catalog.filter(c =>
    c.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (c.category && c.category.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* ─── Header ─── */}
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Receipt size={28} className="text-accent" /> Nova Venda
          </h1>
          <p className="text-muted">Crie uma venda e gere a cobrança para o paciente.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          <ChevronLeft size={18} /> Voltar
        </button>
      </div>

      {/* ─── Stepper ─── */}
      <div className="card mb-8 p-6">
        <div className="flex items-center gap-0">
          {STEPS.map((label, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
                <div
                  className={`w-10 h-10 rounded-full flex-center font-bold text-sm transition-all ${
                    idx < step ? "bg-success text-white" :
                    idx === step ? "bg-accent text-white shadow-lg" :
                    "bg-bg-muted text-muted"
                  }`}
                >
                  {idx < step ? <CheckCircle2 size={18} /> : idx + 1}
                </div>
                <p className={`text-xs mt-1 font-medium ${idx === step ? "text-accent" : "text-muted"}`}>{label}</p>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 transition-colors" style={{ background: idx < step ? "var(--success)" : "var(--border)" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Step 0: Patient ─── */}
      {step === 0 && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-h3 mb-1 flex items-center gap-2"><User size={20} className="text-accent" /> Selecionar Paciente</h2>
            <p className="text-sm text-muted">Busque e selecione o paciente para esta venda.</p>
          </div>

          <div className="input-wrapper">
            <Search size={14} className="input-icon" />
            <input className="input-field with-icon" placeholder="Nome, telefone ou CPF..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2" style={{ maxHeight: 300, overflowY: "auto" }}>
            {filteredPatients.length === 0 && (
              <div className="p-8 text-center text-muted">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p>Nenhum paciente encontrado.</p>
              </div>
            )}
            {filteredPatients.map(p => (
              <button key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedPatient?.id === p.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/40 hover:bg-bg-muted"
                }`}
              >
                <div className="flex-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">{p.phone && `Tel: ${p.phone}`} {p.document && `• CPF: ${p.document}`}</p>
                  </div>
                  {selectedPatient?.id === p.id && <CheckCircle2 size={20} className="text-accent" />}
                </div>
              </button>
            ))}
          </div>

          {selectedPatient && (
            <div className="input-group">
              <label className="input-label">Tipo de Atendimento</label>
              <div className="flex gap-3">
                {["PARTICULAR", "CONVENIO"].map(t => (
                  <button key={t}
                    onClick={() => setAttendanceType(t)}
                    className={`flex-1 p-3 rounded-lg border font-medium text-sm transition-all ${
                      attendanceType === t ? "border-accent bg-accent/5 text-accent" : "border-border hover:border-accent/40"
                    }`}
                  >
                    {t === "PARTICULAR" ? "🏥 Particular" : "🪪 Convênio"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button className="btn btn-primary" disabled={!selectedPatient} onClick={() => setStep(1)}>
              Próximo — Serviços <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 1: Items ─── */}
      {step === 1 && (
        <div className="grid-2" style={{ gap: "1.5rem" }}>
          {/* Left: Catalog */}
          <div className="card p-6 space-y-4">
            <h2 className="text-h3 flex items-center gap-2"><ShoppingBag size={20} className="text-accent" /> Catálogo</h2>
            <div className="input-wrapper">
              <Search size={14} className="input-icon" />
              <input className="input-field input-sm with-icon" placeholder="Pesquisar serviço ou material..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2" style={{ maxHeight: 400, overflowY: "auto" }}>
              {filteredCatalog.map(s => (
                <button key={s.id} onClick={() => addToCart(s)}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-accent/40 hover:bg-bg-muted transition-all"
                >
                  <div className="flex-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name}</p>
                        <span className={`badge ${s.catalogType === "SERVICE" ? (s.type === 'PACOTE' ? "badge-accent" : "badge-info") : "badge-neutral"} text-[10px]`}>
                          {s.catalogType === "SERVICE" ? s.type : 'PRODUTO'}
                        </span>
                      </div>
                      <p className="text-xs text-muted">{s.category} {s.sessions > 1 ? `• ${s.sessions} sessões` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent">{fmt(s.price)}</p>
                      <Plus size={16} className="text-muted ml-auto" />
                    </div>
                  </div>
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <div className="p-8 text-center text-muted">
                  <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum item ativo encontrado.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="card p-6 flex flex-col gap-4">
            <h2 className="text-h3 flex items-center gap-2"><Tag size={20} className="text-accent" /> Itens da Venda</h2>
            <div className="flex flex-col gap-3 flex-1" style={{ minHeight: 200 }}>
              {cart.length === 0 && (
                <div className="flex-center flex-col p-8 text-muted border border-dashed border-border rounded-xl">
                  <ShoppingBag size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Adicione itens do catálogo</p>
                </div>
              )}
              {cart.map(item => (
                <div key={item.item.id} className="p-4 rounded-xl border border-border bg-bg-muted/30">
                  <div className="flex-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{item.item.name}</p>
                      <p className="text-xs text-muted">{fmt(item.unitPrice)} × {item.quantity}</p>
                    </div>
                    <button className="btn-icon text-danger btn-sm" onClick={() => removeFromCart(item.item.id)}><Trash2 size={14} /></button>
                  </div>
                  <div className="grid-2" style={{ gap: "0.5rem" }}>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Qtd</label>
                      <input type="number" min="1" className="input-field input-sm" value={item.quantity}
                        onChange={e => updateItem(item.item.id, "quantity", parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Desconto (R$)</label>
                      <input type="number" min="0" step="0.01" className="input-field input-sm" value={item.discountItem}
                        onChange={e => updateItem(item.item.id, "discountItem", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-top pt-4 space-y-2">
              <div className="flex-between text-sm text-muted"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted flex-1">Desconto geral (R$)</span>
                <input type="number" min="0" step="0.01" className="input-field input-sm" style={{ width: 120 }}
                  value={discountTotal} onChange={e => setDiscountTotal(e.target.value)} placeholder="0,00" />
              </div>
              <div className="flex-between font-bold text-lg"><span>Total</span><span className="text-accent">{fmt(total)}</span></div>
            </div>

            <div className="flex gap-3">
              <button className="btn btn-secondary" onClick={() => setStep(0)}><ChevronLeft size={18} /></button>
              <button className="btn btn-primary flex-1" disabled={cart.length === 0} onClick={() => { setAmountPaid(total.toFixed(2)); setStep(2); }}>
                Pagamento <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 2: Payment ─── */}
      {step === 2 && (
        <div className="grid-2" style={{ gap: "1.5rem" }}>
          {/* Left: Order Summary */}
          <div className="card p-6 space-y-4">
            <h2 className="text-h3 flex items-center gap-2"><Receipt size={20} className="text-accent" /> Resumo</h2>
            {selectedPatient && (
              <div className="p-4 rounded-xl bg-bg-muted/50 border border-border">
                <p className="text-xs text-muted uppercase font-bold mb-1">Paciente</p>
                <p className="font-semibold">{selectedPatient.name}</p>
                {selectedPatient.phone && <p className="text-xs text-muted">{selectedPatient.phone}</p>}
                <span className="badge badge-neutral text-xs mt-1">{attendanceType}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {cart.map(item => (
                <div key={item.item.id} className="flex-between text-sm p-2 rounded-lg hover:bg-bg-muted">
                  <span>{item.item.name} × {item.quantity}</span>
                  <span className="font-medium">{fmt(item.unitPrice * item.quantity - item.discountItem)}</span>
                </div>
              ))}
            </div>
            <div className="border-top pt-3 space-y-1">
              <div className="flex-between text-sm text-muted"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {discountValue > 0 && <div className="flex-between text-sm text-success"><span>Desconto</span><span>-{fmt(discountValue)}</span></div>}
              <div className="flex-between font-bold text-xl pt-1"><span>Total</span><span className="text-accent">{fmt(total)}</span></div>
            </div>
          </div>

          {/* Right: Payment form */}
          <div className="card p-6 space-y-5">
            <h2 className="text-h3 flex items-center gap-2"><CreditCard size={20} className="text-accent" /> Pagamento</h2>

            <div className="input-group">
              <label className="input-label">Forma de Pagamento</label>
              <div className="grid-2" style={{ gap: "0.5rem" }}>
                {[
                  { value: "PIX",      label: "PIX",     Icon: QrCode      },
                  { value: "CREDITO",  label: "Crédito", Icon: CreditCard  },
                  { value: "DEBITO",   label: "Débito",  Icon: CreditCard  },
                  { value: "DINHEIRO", label: "Dinheiro",Icon: Banknote    },
                  { value: "CONVENIO", label: "Convênio",Icon: BadgeCheck  },
                ].map(({ value, label, Icon }) => (
                  <button key={value} onClick={() => setPaymentMethod(value)}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-medium transition-all ${
                      paymentMethod === value ? "border-accent bg-accent/5 text-accent" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Valor Recebido (R$)</label>
              <input type="number" step="0.01" min="0" max={total} className="input-field"
                value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0,00" />
              <div className="flex gap-2 mt-2">
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => setAmountPaid(total.toFixed(2))}>Total ({fmt(total)})</button>
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => setAmountPaid("0")}>Sem entrada</button>
              </div>
            </div>

            {/* Status indicator */}
            <div className={`p-4 rounded-xl border flex-between ${
              saleStatus === "PAGO" ? "border-success bg-success-bg" :
              saleStatus === "PARCIAL" ? "border-warning bg-warning-bg" :
              "border-border bg-bg-muted"
            }`}>
              <div>
                <p className="text-xs text-muted uppercase font-bold">Status</p>
                <p className="font-bold">{saleStatus}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Pendente</p>
                <p className={`font-bold ${pending > 0 ? "text-danger" : "text-success"}`}>{fmt(pending)}</p>
              </div>
            </div>

            <div className="grid-2" style={{ gap: "0.75rem" }}>
              <div className="input-group">
                <label className="input-label">Vencimento</label>
                <input type="date" className="input-field input-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Observações</label>
              <textarea className="input-field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais para o paciente..." />
            </div>

            <div className="flex gap-3">
              <button className="btn btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={18} /></button>
              <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Gerando..." : "Finalizar e Gerar Nota"}
                {!submitting && <CheckCircle2 size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

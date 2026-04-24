"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ShoppingCart,
  CreditCard,
  Banknote,
  Utensils,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  X,
  Tag,
  CheckCircle,
  QrCode,
  LayoutGrid,
} from "lucide-react";
import "./pdv.css";

import { getProductsAndCategories } from "@/actions/products";
import { createOrder, getOpenOrders, addItemsToOrder, getOrderDetails, finalizeOrderPayment, openComanda } from "@/actions/orders";

/* -------------------------------------------------------
   Tipos
------------------------------------------------------- */
interface CartItem { product: any; quantity: number }
interface Adjustment { type: "discount" | "surcharge"; mode: "percent" | "value"; amount: number }

export default function PdvPage() {
  /* ---- Produtos ---- */
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>(["Todos"]);
  const [loading, setLoading] = useState(true);

  /* ---- Filtros ---- */
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  /* ---- Carrinho ---- */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<CartItem | null>(null);

  /* ---- Ajuste financeiro (desconto / acréscimo) ---- */
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);

  /* ---- Modais ---- */
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(false);

  /* ---- Modal de pagamento ---- */
  const [selectedPayment, setSelectedPayment] = useState("");
  const [cardType, setCardType] = useState(""); // Débito, Crédito, etc.
  const [customerName, setCustomerName] = useState("");
  const [fiscalCpf, setFiscalCpf] = useState("");
  const [fiscalNotaLegal, setFiscalNotaLegal] = useState(false);
  const [paying, setPaying] = useState(false);

  /* ---- Modal de desconto ---- */
  const [adjType, setAdjType] = useState<"discount" | "surcharge">("discount");
  const [adjMode, setAdjMode] = useState<"percent" | "value">("percent");
  const [adjAmount, setAdjAmount] = useState("");

  /* ---- Mesas Abertas ---- */
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [newComandaOpen, setNewComandaOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newComandaCustomer, setNewComandaCustomer] = useState("");

  /* -------------------------------------------------------
     Carregar produtos
  ------------------------------------------------------- */
  useEffect(() => {
    getProductsAndCategories().then((data) => {
      setDbProducts(data.products);
      if (data.categories.length > 0) setDbCategories(data.categories);
      setLoading(false);
    });
  }, []);

  /* -------------------------------------------------------
     Filtros
  ------------------------------------------------------- */
  const filteredProducts = dbProducts.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  /* -------------------------------------------------------
     Carrinho — operações
  ------------------------------------------------------- */
  const addToCart = useCallback((product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setLastAdded({ product, quantity: 1 });
  }, []);

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setAdjustment(null);
    setLastAdded(null);
    setActiveOrderId(null);
  };

  /* -------------------------------------------------------
     Cálculos financeiros
  ------------------------------------------------------- */
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  let adjustmentValue = 0;
  if (adjustment) {
    if (adjustment.mode === "percent") {
      adjustmentValue = (subtotal * adjustment.amount) / 100;
    } else {
      adjustmentValue = adjustment.amount;
    }
  }

  const total =
    adjustment?.type === "discount"
      ? subtotal - adjustmentValue
      : adjustment?.type === "surcharge"
      ? subtotal + adjustmentValue
      : subtotal;

  /* -------------------------------------------------------
     Atalhos de teclado F8–F12
  ------------------------------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case "F8":
          e.preventDefault();
          if (cart.length > 0) { setSelectedPayment("Dinheiro"); setCheckoutOpen(true); }
          break;
        case "F9":
          e.preventDefault();
          if (cart.length > 0) { setSelectedPayment(""); setCheckoutOpen(true); }
          break;
        case "F10":
          e.preventDefault();
          if (cart.length > 0) { setSelectedPayment(""); setCheckoutOpen(true); }
          break;
        case "F11":
          e.preventDefault();
          setDiscountOpen(true);
          break;
        case "F12":
          e.preventDefault();
          if (cart.length > 0 && confirm("Limpar todo o carrinho?")) clearCart();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  /* -------------------------------------------------------
     Mesas Abertas
  ------------------------------------------------------- */
  const fetchOpenOrders = async () => {
    setLoadingOrders(true);
    const res = await getOpenOrders();
    if (res.success) setOpenOrders(res.orders || []);
    setLoadingOrders(false);
  };

  const handleLaunchToTable = async (orderId: string) => {
    if (cart.length === 0) return alert("Selecione itens primeiro.");
    setPaying(true);
    const items = cart.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      price: i.product.price,
    }));
    const res = await addItemsToOrder(orderId, items);
    if (res.success) {
      alert("Itens lançados na mesa com sucesso!");
      clearCart();
      setTablesOpen(false);
    } else {
      alert("Erro ao lançar itens.");
    }
    setPaying(false);
  };

  const handleReceiveOrder = async (orderId: string) => {
    setLoadingOrders(true);
    const res = await getOrderDetails(orderId);
    if (res.success && res.order) {
      const items = res.order.items.map((i: any) => ({
        product: i.product,
        quantity: i.quantity
      }));
      setCart(items);
      setActiveOrderId(orderId);
      setCustomerName(res.order.customerName || "");
      setTablesOpen(false);
      setCheckoutOpen(true);
    } else {
      alert("Erro ao carregar detalhes da comanda.");
    }
    setLoadingOrders(false);
  };

  const handleOpenNewComanda = async () => {
    if (!newTableNumber.trim()) return alert("Informe o número da mesa ou nome da comanda.");
    setPaying(true);
    const res = await openComanda(newTableNumber, newComandaCustomer);
    if (res.success) {
      alert("Comanda aberta com sucesso!");
      setNewComandaOpen(false);
      setNewTableNumber("");
      setNewComandaCustomer("");
      fetchOpenOrders();
    } else {
      alert(res.message || "Erro ao abrir comanda.");
    }
    setPaying(false);
  };

  /* -------------------------------------------------------
     Finalizar pagamento
  ------------------------------------------------------- */
  const handleFinalizePayment = async () => {
    if (!selectedPayment) return alert("Selecione o método de pagamento.");
    if (selectedPayment === "Cartão" && !cardType) return alert("Selecione o tipo de cartão.");
    if (!customerName.trim()) return alert("Informe o nome do cliente.");

    setPaying(true);
    const method = selectedPayment === "Cartão" ? `${selectedPayment} (${cardType})` : selectedPayment;

    let res;
    if (activeOrderId) {
      // Finalizar comanda existente
      res = await finalizeOrderPayment(activeOrderId, { 
        paymentMethod: method, 
        cpf: fiscalCpf, 
        notalegal: fiscalNotaLegal 
      });
    } else {
      // Venda direta no balcão
      const items = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        price: i.product.price,
      }));

      res = await createOrder({
        table: "Balcão",
        customerName: customerName,
        items: items,
        paymentMethod: method,
        status: selectedPayment === "Dinheiro" ? "CLOSED" : "PREPARING",
        cpf: fiscalCpf,
        notalegal: fiscalNotaLegal
      });
    }

    if (res.success) {
      const msg = (selectedPayment === "Dinheiro" || activeOrderId) 
        ? `✅ Venda finalizada e confirmada! — ${customerName}.`
        : `✅ Pedido enviado à cozinha — ${customerName}.`;
      alert(msg);
      clearCart();
      setCustomerName("");
      setFiscalCpf("");
      setFiscalNotaLegal(false);
      setSelectedPayment("");
      setCardType("");
      setCheckoutOpen(false);
    } else {
      alert(res.message || "Erro ao processar venda.");
    }
    setPaying(false);
  };

  const handleApplyAdjustment = () => {
    const amt = parseFloat(adjAmount.replace(",", "."));
    if (!amt || amt <= 0) return alert("Informe um valor válido.");
    if (adjMode === "percent" && amt > 100) return alert("Percentual máximo é 100%.");
    setAdjustment({ type: adjType, mode: adjMode, amount: amt });
    setDiscountOpen(false);
    setAdjAmount("");
  };

  const metricProduct = lastAdded?.product;
  const metricQty = metricProduct ? (cart.find((i) => i.product.id === metricProduct.id)?.quantity ?? 1) : 0;

  return (
    <div className="pdv-root">
      <div className="pdv-body">
        {/* ---- ESQUERDA: Carrinho ---- */}
        <div className="pdv-cart">
          <div className="pdv-cart-header">
            <p className="pdv-cart-title">Carrinho de Compras</p>
            <p className="pdv-cart-subtitle">Passe o produto ou selecione no catálogo</p>
          </div>

          <div className="pdv-cart-table-wrap">
            {cart.length === 0 ? (
              <div className="pdv-cart-empty">
                <ShoppingCart size={48} />
                <p style={{ fontWeight: 500 }}>Carrinho vazio</p>
              </div>
            ) : (
              <table className="pdv-cart-table">
                <thead>
                  <tr>
                    <th style={{ width: "15%" }}>Qtde</th>
                    <th style={{ width: "44%" }}>Produto</th>
                    <th style={{ width: "20%" }}>Unitário</th>
                    <th style={{ width: "18%" }}>Total</th>
                    <th style={{ width: "3%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.product.id}>
                      <td>
                        <div className="qty-cell">
                          <button className="qty-btn" onClick={() => updateQty(item.product.id, -1)}>
                            {item.quantity === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.product.id, 1)}>
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{item.product.name}</td>
                      <td>R$ {item.product.price.toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>R$ {(item.product.price * item.quantity).toFixed(2)}</td>
                      <td>
                        <button className="remove-btn" onClick={() => updateQty(item.product.id, -item.quantity)}>
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pdv-cart-summary">
            <div className="pdv-summary-row">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {adjustment && (
              <div className={`pdv-summary-row ${adjustment.type === "discount" ? "discount" : "surcharge"}`}>
                <span>{adjustment.type === "discount" ? "Desconto" : "Acréscimo"} ({adjustment.mode === "percent" ? `${adjustment.amount}%` : `R$ ${adjustment.amount.toFixed(2)}`})</span>
                <span>{adjustment.type === "discount" ? "-" : "+"}R$ {adjustmentValue.toFixed(2)}</span>
              </div>
            )}
            <div className="pdv-summary-divider" />
            <div className="pdv-total-row">
              <span className="pdv-total-label">Total a Pagar</span>
              <span className="pdv-total-value">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ---- DIREITA: Catálogo ---- */}
        <div className="pdv-catalog">
          <div className="pdv-topbar">
            <div className="pdv-brand">
              <div className="pdv-brand-icon"><Utensils size={16} color="white" /></div>
              Restaurante ERP
            </div>
            <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              <ArrowLeft size={15} /> Voltar
            </Link>
          </div>

          <div className="pdv-search-section">
            <div className="pdv-search-bar">
              <Search size={18} color="var(--text-muted)" />
              <input type="text" className="pdv-search-input" placeholder="Pesquisar produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
            </div>
            <div className="pdv-metrics">
              <div className="pdv-metric-box">
                <p className="pdv-metric-label">Preço Unit.</p>
                <p className="pdv-metric-value">{metricProduct ? `R$ ${metricProduct.price.toFixed(2)}` : "—"}</p>
              </div>
              <div className="pdv-metric-box">
                <p className="pdv-metric-label">Subtotal Item</p>
                <p className="pdv-metric-value">{metricProduct ? `R$ ${(metricProduct.price * metricQty).toFixed(2)}` : "—"}</p>
              </div>
              <div className="pdv-metric-box">
                <p className="pdv-metric-label">Total Geral</p>
                <p className="pdv-metric-value accent">R$ {total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="pdv-catalog-body">
            <div className="pdv-categories">
              {dbCategories.map((cat) => (
                <button key={cat} className={`pdv-cat-pill ${selectedCategory === cat ? "active" : ""}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
              ))}
            </div>
            <div className="pdv-product-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="pdv-product-card" onClick={() => addToCart(product)}>
                  <div className="pdv-product-emoji">
                    {product.image?.startsWith("http") ? <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : product.image || "🍽️"}
                  </div>
                  <p className="pdv-product-name">{product.name}</p>
                  <p className="pdv-product-price">R$ {product.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================
          RODAPÉ
      ================================================ */}
      <div className="pdv-footer">
        <button className="pdv-action-btn primary" disabled={cart.length === 0} onClick={() => { setSelectedPayment("Dinheiro"); setCheckoutOpen(true); }}>
          <Banknote size={15} /> Dinheiro <span className="pdv-key-hint">F8</span>
        </button>

        <button className="pdv-action-btn primary" disabled={cart.length === 0} onClick={() => { setSelectedPayment(""); setCheckoutOpen(true); }}>
          <CreditCard size={15} /> Formas de Pagamento <span className="pdv-key-hint">F9</span>
        </button>

        <button className="pdv-action-btn primary" onClick={() => { fetchOpenOrders(); setTablesOpen(true); }}>
          <LayoutGrid size={15} /> Mesas Abertas
        </button>

        <button className="pdv-action-btn success" disabled={cart.length === 0} onClick={() => { setSelectedPayment(""); setCheckoutOpen(true); }}>
          <CheckCircle size={15} /> Finalizar Venda <span className="pdv-key-hint">F10</span>
        </button>

        <button className="pdv-action-btn warning" onClick={() => setDiscountOpen(true)}>
          <Tag size={15} /> Desc/Acrésc <span className="pdv-key-hint">F11</span>
        </button>

        <button className="pdv-action-btn danger" disabled={cart.length === 0} onClick={() => { if (confirm("Limpar carrinho?")) clearCart(); }}>
          <Trash2 size={15} /> Cancelar <span className="pdv-key-hint">F12</span>
        </button>
      </div>

      {/* MODAL PAGAMENTO */}
      {checkoutOpen && (
        <div className="pdv-modal-overlay" onClick={(e) => e.target === e.currentTarget && setCheckoutOpen(false)}>
          <div className="pdv-modal">
            <div className="pdv-modal-header">
              <span className="pdv-modal-title">Finalizar Pagamento</span>
              <button className="btn-icon" onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
            </div>
            <div className="pdv-modal-body">
              <div style={{ background: "var(--bg-subtle)", padding: "1rem", borderRadius: "8px" }}>
                <div className="flex-between"><span>Total</span><span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>R$ {total.toFixed(2)}</span></div>
              </div>

              <div className="input-group">
                <label className="input-label">Método de Pagamento</label>
                <div className="grid-2" style={{ gap: "10px" }}>
                  <button className={`pdv-toggle-btn ${selectedPayment === "Dinheiro" ? "active" : ""}`} onClick={() => { setSelectedPayment("Dinheiro"); setCardType(""); }}>💵 Dinheiro</button>
                  <button className={`pdv-toggle-btn ${selectedPayment === "Pix" ? "active" : ""}`} onClick={() => { setSelectedPayment("Pix"); setCardType(""); }}>📱 Pix</button>
                </div>
                <div className="mt-2">
                  <label className="input-label">Cartão</label>
                  <div className="grid-2" style={{ gap: "5px" }}>
                    {["Débito", "Crédito", "Alimentação", "Refeição"].map(t => (
                      <button key={t} className={`pdv-toggle-btn ${selectedPayment === "Cartão" && cardType === t ? "active" : ""}`} onClick={() => { setSelectedPayment("Cartão"); setCardType(t); }}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Nome do Cliente</label>
                <input type="text" className="input-field" placeholder="Ex: João Silva" autoFocus value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>

              <div className="bg-secondary p-3 rounded mt-4">
                <p className="text-xs font-bold text-muted mb-2 uppercase">Dados Fiscais (Opcional)</p>
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    className="input-field text-sm" 
                    placeholder="CPF na Nota" 
                    value={fiscalCpf} 
                    onChange={(e) => setFiscalCpf(e.target.value)} 
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={fiscalNotaLegal} 
                      onChange={(e) => setFiscalNotaLegal(e.target.checked)} 
                    />
                    <span className="text-xs">Participar do NotaLegal</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="pdv-modal-footer">
              <button className="btn btn-secondary" onClick={() => setCheckoutOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleFinalizePayment} disabled={paying || !selectedPayment}>{paying ? "Processando..." : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MESAS ABERTAS */}
      {tablesOpen && (
        <div className="pdv-modal-overlay" onClick={(e) => e.target === e.currentTarget && setTablesOpen(false)}>
          <div className="pdv-modal" style={{ maxWidth: "600px" }}>
            <div className="pdv-modal-header">
              <span className="pdv-modal-title">Mesas Abertas</span>
              <button className="btn-icon" onClick={() => setTablesOpen(false)}><X size={18} /></button>
            </div>
            <div className="pdv-modal-body">
              {loadingOrders ? <p>Carregando...</p> : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <button className="btn btn-primary" onClick={() => setNewComandaOpen(true)}>
                      <Plus size={16} /> Abrir Nova Comanda
                    </button>
                  </div>
                  <div className="grid-2" style={{ gap: "10px" }}>
                  {openOrders.map(order => (
                    <div key={order.id} className="card" style={{ padding: "10px" }}>
                      <div className="flex-between">
                        <span style={{ fontWeight: 700 }}>{order.table}</span>
                        <span className="badge badge-neutral">R$ {order.total.toFixed(2)}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.customerName || "S/ Nome"}</p>
                      <div className="grid-2 mt-2" style={{ gap: "5px" }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleLaunchToTable(order.id)} disabled={cart.length === 0}>Lançar</button>
                        <button className="btn btn-sm btn-success" onClick={() => handleReceiveOrder(order.id)}>Receber</button>
                      </div>
                    </div>
                  ))}
                  {openOrders.length === 0 && <p>Nenhuma mesa aberta.</p>}
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESCONTO (Original) */}
      {discountOpen && (
        <div className="pdv-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDiscountOpen(false)}>
          <div className="pdv-modal">
            <div className="pdv-modal-header">
              <span className="pdv-modal-title">Ajuste Financeiro</span>
              <button className="btn-icon" onClick={() => setDiscountOpen(false)}><X size={18} /></button>
            </div>
            <div className="pdv-modal-body">
              <div className="pdv-toggle-group">
                <button className={`pdv-toggle-btn ${adjType === "discount" ? "active" : ""}`} onClick={() => setAdjType("discount")}>Desconto</button>
                <button className={`pdv-toggle-btn ${adjType === "surcharge" ? "active" : ""}`} onClick={() => setAdjType("surcharge")}>Acréscimo</button>
              </div>
              <div className="pdv-toggle-group">
                <button className={`pdv-toggle-btn ${adjMode === "percent" ? "active" : ""}`} onClick={() => setAdjMode("percent")}>%</button>
                <button className={`pdv-toggle-btn ${adjMode === "value" ? "active" : ""}`} onClick={() => setAdjMode("value")}>R$</button>
              </div>
              <input type="number" className="input-field" placeholder="Valor" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleApplyAdjustment()} />
            </div>
            <div className="pdv-modal-footer">
              <button className="btn btn-primary w-100" onClick={handleApplyAdjustment}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA COMANDA */}
      {newComandaOpen && (
        <div className="pdv-modal-overlay" onClick={(e) => e.target === e.currentTarget && setNewComandaOpen(false)}>
          <div className="pdv-modal">
            <div className="pdv-modal-header">
              <span className="pdv-modal-title">Abrir Nova Comanda</span>
              <button className="btn-icon" onClick={() => setNewComandaOpen(false)}><X size={18} /></button>
            </div>
            <div className="pdv-modal-body">
              <div className="input-group">
                <label className="input-label">Mesa / Número da Comanda *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Mesa 05" 
                  autoFocus 
                  value={newTableNumber} 
                  onChange={(e) => setNewTableNumber(e.target.value)} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Nome do Cliente (Opcional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Carlos" 
                  value={newComandaCustomer} 
                  onChange={(e) => setNewComandaCustomer(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleOpenNewComanda()}
                />
              </div>
            </div>
            <div className="pdv-modal-footer">
              <button className="btn btn-secondary" onClick={() => setNewComandaOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleOpenNewComanda} disabled={paying}>
                {paying ? "Abrindo..." : "Abrir Comanda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MenuSquare,
  Search,
  Send,
  Plus,
  Minus,
  CheckCircle2,
  ListOrdered,
  LogOut,
  Activity,
  Utensils,
  RefreshCw,
  ChefHat,
  X,
  LayoutGrid,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import "./comanda.css";

import { getProductsAndCategories } from "@/actions/products";
import { openComanda, addItemsToOrder, requestOrderClosure, getOrderStatus, getOpenOrders, getWaiterStats } from "@/actions/orders";

export default function ComandaMobile() {
  const [activeTab, setActiveTab] = useState("abertura");
  const [mesa, setMesa] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderTime, setOrderTime] = useState<Date | null>(null);
  const [opening, setOpening] = useState(false);
  const [cart, setCart] = useState<{ product: any; quantity: number; notes: string }[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClosingRequested, setIsClosingRequested] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>("OPEN");
  const [prevStatus, setPrevStatus] = useState<string>("OPEN");
  const [readyNotification, setReadyNotification] = useState(false);

  /* ---- Mesas Abertas ---- */
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [waiterStats, setWaiterStats] = useState({ totalCount: 0, totalValue: 0 });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getWaiterStats().then(res => {
      if (res.success && "stats" in res) setWaiterStats(res.stats as any);
    });
  }, [activeTab]);

  useEffect(() => {
    getProductsAndCategories().then((data) => {
      setDbProducts(data.products);
      setLoading(false);
    });
  }, []);

  const fetchOpenOrders = async () => {
    setLoadingOrders(true);
    const res = await getOpenOrders();
    if (res.success) setOpenOrders(res.orders || []);
    setLoadingOrders(false);
  };

  const refreshStatus = async () => {
    if (!orderId) return;
    const res = await getOrderStatus(orderId);
    if (res.success && res.status) {
      const newStatus = res.status;
      if (prevStatus !== "READY" && newStatus === "READY") {
        setReadyNotification(true);
        notifTimeoutRef.current = setTimeout(() => setReadyNotification(false), 5000);
      }
      setPrevStatus(newStatus);
      setOrderStatus(newStatus);
      if (newStatus === "CLOSING_REQUESTED" || newStatus === "BILL_PRINTED") {
        setIsClosingRequested(true);
      }
    }
  };

  useEffect(() => {
    if (!orderId) return;
    refreshStatus();
    pollingRef.current = setInterval(refreshStatus, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
  }, [orderId]);

  const filteredProducts = dbProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    const existing = cart.find((i) => i.product.id === product.id);
    if (existing) {
      setCart(cart.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { product, quantity: 1, notes: "" }]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map((i) => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0));
  };

  const handleOpenComanda = async () => {
    if (!mesa.trim()) return alert("Informe o número da mesa!");
    setOpening(true);
    const res = await openComanda(`Mesa ${mesa}`, customerName);
    if (res.success) {
      setOrderId(res.orderId as string);
      setOrderTime(res.createdAt ? new Date(res.createdAt) : new Date());
      setOrderStatus("OPEN");
      setActiveTab("cardapio");
    } else {
      alert("Erro ao abrir comanda.");
    }
    setOpening(false);
  };

  const handleSendOrder = async () => {
    if (cart.length === 0 || !orderId) return;
    setSending(true);
    const items = cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price, notes: i.notes }));
    const res = await addItemsToOrder(orderId, items);
    if (res.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCart([]);
        setActiveTab("cardapio");
        setSending(false);
      }, 2000);
    } else {
      alert("Erro ao enviar pedido.");
      setSending(false);
    }
  };

  const handleRequestClosure = async () => {
    if (!orderId) return;
    setClosing(true);
    const res = await requestOrderClosure(orderId);
    if (res.success) {
      setIsClosingRequested(true);
      alert("Fechamento solicitado!");
    } else {
      alert("Erro ao solicitar fechamento.");
    }
    setClosing(false);
  };

  const selectExistingOrder = (order: any) => {
    setOrderId(order.id);
    setMesa(order.table.replace("Mesa ", ""));
    setCustomerName(order.customerName || "");
    setOrderTime(new Date(order.createdAt));
    setOrderStatus(order.status);
    setIsClosingRequested(order.status === "CLOSING_REQUESTED" || order.status === "BILL_PRINTED");
    setActiveTab("mesa");
    setSelectedOrderDetails(null);
  };

  const cartTotal = cart.reduce((t, i) => t + i.product.price * i.quantity, 0);
  const cartItemsCount = cart.reduce((a, i) => a + i.quantity, 0);

  const statusLabel: Record<string, string> = { OPEN: "Em Aberto", PREPARING: "Na Cozinha", READY: "Pronto! 🍽️", CLOSING_REQUESTED: "Aguardando Caixa", BILL_PRINTED: "Conta Impressa", CLOSED: "Pago" };
  const statusBadge: Record<string, string> = { OPEN: "badge-neutral", PREPARING: "badge-warning", READY: "badge-success", CLOSING_REQUESTED: "badge-danger", BILL_PRINTED: "badge-danger", CLOSED: "badge-success" };

  return (
    <div className="mobile-layout">
      {readyNotification && (
        <div className="ready-notification">
          <CheckCircle2 size={20} /> Pedido da Mesa {mesa} pronto!
          <button onClick={() => setReadyNotification(false)} style={{ background: "none", border: "none", color: "white", marginLeft: "auto" }}><X size={16} /></button>
        </div>
      )}

      <header className="mobile-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="mobile-topbar-icon"><Utensils size={15} color="white" /></div>
          {orderId ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="mesa-badge">Mesa {mesa} {customerName && `· ${customerName}`}</span>
            </div>
          ) : <span className="mesa-badge empty">Nenhuma mesa aberta</span>}
        </div>
        <Link href="/" className="btn-icon"><LogOut size={18} color="var(--text-muted)" /></Link>
      </header>

      <main className="mobile-main">
        {/* ABA HOME (Abertura + Performance) */}
        {activeTab === "abertura" && (
          <div className="animate-fade-in">
            {/* Performance Widget */}
            <div className="card mb-6" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)", color: "white", border: "none" }}>
              <div className="flex-between mb-4">
                <span className="text-sm font-bold uppercase tracking-wider opacity-80">Meu Desempenho (Hoje)</span>
                <TrendingUp size={16} className="opacity-80" />
              </div>
              <div className="grid-2">
                <div>
                  <p className="text-xs opacity-70">Pedidos Enviados</p>
                  <p className="text-h2" style={{ color: "white" }}>{waiterStats.totalCount}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="text-xs opacity-70">Total em Vendas</p>
                  <p className="text-h2" style={{ color: "white" }}>R$ {waiterStats.totalValue.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="abertura-card">
              <div className="abertura-logo"><MenuSquare size={24} color="var(--accent)" /></div>
              <h2 className="text-h2 text-center">Nova Comanda</h2>
              <div className="input-group mt-8">
                <label className="input-label">Número da Mesa</label>
                <input type="number" className="input-field" placeholder="Ex: 12" value={mesa} onChange={(e) => setMesa(e.target.value)} />
              </div>
              <div className="input-group mt-8">
                <label className="input-label">Cliente (opcional)</label>
                <input type="text" className="input-field" placeholder="Ex: João" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-lg w-100 mt-8" onClick={handleOpenComanda} disabled={opening || !mesa.trim()}>{opening ? "Abrindo..." : "Abrir Mesa"}</button>
            </div>
          </div>
        )}

        {/* ABA MESAS ABERTAS */}
        {activeTab === "mesas" && (
          <div className="animate-fade-in">
            <h2 className="text-h3 mb-6">Comandas Ativas</h2>
            <div className="mobile-product-list">
              {loadingOrders ? <p>Carregando...</p> : openOrders.map(order => (
                <div key={order.id} className="mobile-product-card" onClick={() => setSelectedOrderDetails(order)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className="product-emoji-small"><LayoutGrid size={18} /></div>
                    <div>
                      <p style={{ fontWeight: 700 }}>{order.table}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.customerName || "S/ nome"}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: 700, color: "var(--accent)" }}>R$ {order.total.toFixed(2)}</p>
                    <ChevronRight size={16} color="var(--text-placeholder)" />
                  </div>
                </div>
              ))}
              {openOrders.length === 0 && !loadingOrders && <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Nenhuma mesa aberta.</p>}
            </div>
          </div>
        )}

        {/* MODAL DETALHES DA MESA */}
        {selectedOrderDetails && (
          <div className="success-overlay" style={{ background: "rgba(255,255,255,0.98)" }}>
            <div style={{ width: "90%", maxWidth: "400px" }}>
              <div className="flex-between mb-6">
                <h2 className="text-h2">{selectedOrderDetails.table}</h2>
                <button className="btn-icon" onClick={() => setSelectedOrderDetails(null)}><X size={24} /></button>
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "1.5rem" }}>
                {selectedOrderDetails.items.map((item: any, i: number) => (
                  <div key={i} className="flex-between py-2 border-b">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex-between mb-8">
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>R$ {selectedOrderDetails.total.toFixed(2)}</span>
              </div>
              <button className="btn btn-primary w-100" onClick={() => selectExistingOrder(selectedOrderDetails)}>Continuar nesta Mesa</button>
            </div>
          </div>
        )}

        {/* ABA CARDÁPIO */}
        {activeTab === "cardapio" && (
          <div className="animate-fade-in">
            <div className="mobile-search-bar"><Search size={16} color="var(--text-muted)" /><input type="text" className="mobile-search-input" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <div className="mobile-product-list">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.product.id === product.id);
                return (
                  <div key={product.id} className="mobile-product-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="product-emoji-small">{product.image || "🍽️"}</div>
                      <div><p style={{ fontWeight: 600 }}>{product.name}</p><p style={{ fontWeight: 700, color: "var(--accent)" }}>R$ {product.price.toFixed(2)}</p></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {inCart && <><button className="mobile-qty-btn" onClick={() => updateQuantity(product.id, -1)}><Minus size={13} /></button><span style={{ fontWeight: 700 }}>{inCart.quantity}</span></>}
                      <button className="mobile-add-btn" onClick={() => addToCart(product)}><Plus size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA MESA (RESUMO) */}
        {activeTab === "mesa" && (
          <div className="animate-fade-in">
            <h2 className="text-h3 mb-6">Mesa {mesa}</h2>
            {cart.length === 0 ? <p style={{ textAlign: "center", padding: "2rem" }}>Adicione itens do cardápio.</p> : (
              <div className="mobile-cart-list">
                {cart.map((item, idx) => (
                  <div key={idx} className="mobile-cart-item">
                    <div className="flex-between"><span>{item.product.name}</span><span>R$ {(item.product.price * item.quantity).toFixed(2)}</span></div>
                    <div className="flex-between mt-8"><input type="text" className="mobile-note-input" placeholder="Obs..." value={item.notes} onChange={e => setCart(cart.map((c, i) => i === idx ? {...c, notes: e.target.value} : c))} />
                      <div className="mobile-qty-controls"><button className="mobile-qty-btn" onClick={() => updateQuantity(item.product.id, -1)}><Minus size={13} /></button><span style={{ fontWeight: 700 }}>{item.quantity}</span><button className="mobile-qty-btn" onClick={() => updateQuantity(item.product.id, 1)}><Plus size={13} /></button></div>
                    </div>
                  </div>
                ))}
                <div className="mobile-total-box mt-8">
                  <div className="flex-between mb-8"><span>Total</span><span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>R$ {cartTotal.toFixed(2)}</span></div>
                  <button className="btn btn-primary w-100" onClick={handleSendOrder} disabled={sending}>{sending ? "Enviando..." : "Enviar Pedido"}</button>
                </div>
                {!isClosingRequested && <button className="btn btn-secondary w-100 mt-8" onClick={handleRequestClosure} disabled={closing}>Pedir Conta</button>}
              </div>
            )}
          </div>
        )}

        {/* ABA STATUS */}
        {activeTab === "status" && (
          <div className="animate-fade-in status-center">
            <div className={`status-icon-wrap ${orderStatus === "READY" ? "ready" : "preparing"}`}><ChefHat size={32} /></div>
            <h2 className="text-h2">Mesa {mesa}</h2>
            <div className="status-card">
              <div className="flex-between mb-6"><span>Status</span><span className={`badge ${statusBadge[orderStatus]}`}>{statusLabel[orderStatus]}</span></div>
              <button className="btn btn-secondary w-100" onClick={refreshStatus}><RefreshCw size={15} /> Atualizar</button>
            </div>
          </div>
        )}

        {showSuccess && <div className="success-overlay"><CheckCircle2 size={72} color="var(--success)" /><h2 className="text-h2">Enviado!</h2></div>}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-tab ${activeTab === "abertura" ? "active" : ""}`} onClick={() => setActiveTab("abertura")}><MenuSquare size={22} /><span>Nova</span></button>
        <button className={`nav-tab ${activeTab === "mesas" ? "active" : ""}`} onClick={() => { fetchOpenOrders(); setActiveTab("mesas"); }}><LayoutGrid size={22} /><span>Mesas</span></button>
        <button className={`nav-tab ${activeTab === "cardapio" ? "active" : ""}`} onClick={() => setActiveTab("cardapio")}><Search size={22} /><span>Cardápio</span></button>
        <button className={`nav-tab ${activeTab === "mesa" ? "active" : ""}`} onClick={() => setActiveTab("mesa")}><ListOrdered size={22} /><span>Comanda</span>{cartItemsCount > 0 && <span className="cart-badge">{cartItemsCount}</span>}</button>
        <button className={`nav-tab ${activeTab === "status" ? "active" : ""}`} onClick={() => setActiveTab("status")}><Activity size={22} /><span>Status</span></button>
      </nav>
    </div>
  );
}

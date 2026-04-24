"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  ChevronRight, 
  DollarSign, 
  Trash2, 
  CheckCircle, 
  X, 
  Phone,
  LayoutDashboard,
  ShoppingBag,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { getMonthlyTabs, createMonthlyTab, addOrderToTab, settleTab, getMonthlyDashboard } from "@/actions/monthly";
import { getProductsAndCategories } from "@/actions/products";

export default function MonthlyTabsPage() {
  const [tabs, setTabs] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState({ totalSales: 0, pendingReceivables: 0 });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modais
  const [isNewTabModalOpen, setIsNewTabModalOpen] = useState(false);
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<any>(null);

  // Form states
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [cart, setCart] = useState<{ productId: string, name: string, quantity: number, price: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, d, prodData] = await Promise.all([
        getMonthlyTabs(),
        getMonthlyDashboard(),
        getProductsAndCategories()
      ]);
      setTabs(t || []);
      setDashboard(d || { totalSales: 0, pendingReceivables: 0 });
      setProducts(prodData?.products || []);
    } catch (err: any) {
      console.error("LoadData Error:", err);
      setError("Não foi possível carregar os dados da caderneta. Verifique sua conexão ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) return;
    try {
      const res = await createMonthlyTab(newCustomerName, newCustomerPhone);
      if (res.success) {
        setIsNewTabModalOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
        loadData();
      } else {
        alert(res.message || "Erro ao criar conta.");
      }
    } catch (err) {
      alert("Erro de conexão ao criar conta.");
    }
  };

  const handleAddOrder = async () => {
    if (cart.length === 0) return alert("Adicione produtos ao pedido.");
    try {
      const res = await addOrderToTab(selectedTab.id, cart.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price
      })));
      if (res.success) {
        setIsAddOrderModalOpen(false);
        setCart([]);
        loadData();
      } else {
        alert(res.message || "Erro ao lançar pedido.");
      }
    } catch (err) {
      alert("Erro de conexão ao lançar pedido.");
    }
  };

  const handleSettle = async (tab: any) => {
    const balance = tab.balance || 0;
    if (confirm(`Deseja dar baixa total na conta de ${tab.customerName}? O saldo de R$ ${balance.toFixed(2)} será zerado.`)) {
      try {
        const res = await settleTab(tab.id);
        if (res.success) loadData();
        else alert(res.message || "Erro ao dar baixa.");
      } catch (err) {
        alert("Erro de conexão ao dar baixa.");
      }
    }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, price: product.price }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const filteredTabs = (tabs || []).filter(t => t.customerName?.toLowerCase().includes(search.toLowerCase()));

  // Helpers de Estilo
  const flexBetween = { display: "flex", alignItems: "center", justifyContent: "space-between" };
  const flexCenter = { display: "flex", alignItems: "center", justifyContent: "center" };

  if (loading) return (
    <div style={{ ...flexCenter, height: "100vh", flexDirection: "column", gap: "1rem", color: "#64748b" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ fontWeight: 600 }}>Carregando caderneta...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ ...flexCenter, height: "100vh", flexDirection: "column", padding: "2rem", textAlign: "center" }}>
      <AlertCircle size={48} color="#ef4444" style={{ marginBottom: "1rem" }} />
      <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Ops! Algo deu errado</h2>
      <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>{error}</p>
      <button onClick={loadData} style={{ background: "#8b5cf6", color: "white", padding: "0.75rem 1.5rem", borderRadius: "0.75rem", fontWeight: 700 }}>Tentar Novamente</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "100px", fontFamily: "sans-serif" }}>
      {/* HEADER FIXO MOBILE */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, backgroundColor: "white", borderBottom: "1px solid #e2e8f0", padding: "1rem" }}>
        <div style={{ ...flexBetween, marginBottom: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Caderneta da Priscila</h1>
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "2px 0 0" }}>Gestão de contas mensais</p>
          </div>
          <div style={{ backgroundColor: "#f3e8ff", padding: "0.5rem", borderRadius: "99px", color: "#7c3aed" }}>
            <Users size={20} />
          </div>
        </div>

        {/* DASHBOARD COMPACTO */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 800, color: "#94a3b8", marginBottom: "2px" }}>Vendas (Mês)</p>
            <p style={{ fontSize: "1.125rem", fontWeight: 800, color: "#334155", margin: 0 }}>R$ {(dashboard?.totalSales || 0).toFixed(2)}</p>
          </div>
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 800, color: "#94a3b8", marginBottom: "2px" }}>A Receber</p>
            <p style={{ fontSize: "1.125rem", fontWeight: 800, color: "#7c3aed", margin: 0 }}>R$ {(dashboard?.pendingReceivables || 0).toFixed(2)}</p>
          </div>
        </div>
      </header>

      {/* BUSCA */}
      <div style={{ padding: "1rem" }}>
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            style={{ width: "100%", backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "0.75rem 0.75rem 0.75rem 2.5rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      <div style={{ padding: "0 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredTabs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8", backgroundColor: "white", borderRadius: "1rem", border: "1px dashed #cbd5e1" }}>
            <Users size={48} style={{ margin: "0 auto 0.75rem", opacity: 0.2 }} />
            <p>Nenhum cliente em aberto.</p>
          </div>
        ) : (
          filteredTabs.map((tab) => (
            <div key={tab.id} style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "1rem", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ ...flexBetween, marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#f1f5f9", ...flexCenter, color: "#64748b", fontWeight: 700 }}>
                    {tab.customerName ? tab.customerName[0] : "?"}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>{tab.customerName}</h3>
                    {tab.phoneNumber && (
                      <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "2px 0 0", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Phone size={10} /> {tab.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, margin: 0 }}>Dívida</p>
                  <p style={{ fontSize: "1.125rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>R$ {(tab.balance || 0).toFixed(2)}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => { setSelectedTab(tab); setIsAddOrderModalOpen(true); }}
                  style={{ flex: 1, backgroundColor: "#7c3aed", color: "white", padding: "0.75rem", borderRadius: "0.75rem", fontSize: "0.875rem", fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                >
                  <Plus size={18} /> Lançar Pedido
                </button>
                <button 
                  onClick={() => handleSettle(tab)}
                  style={{ width: "48px", backgroundColor: "#dcfce7", color: "#16a34a", borderRadius: "0.75rem", border: "none", cursor: "pointer", ...flexCenter }}
                >
                  <CheckCircle size={22} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* BOTÃO FLUTUANTE NOVO CLIENTE */}
      <button 
        onClick={() => setIsNewTabModalOpen(true)}
        style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", width: "3.5rem", height: "3.5rem", backgroundColor: "#1e293b", color: "white", borderRadius: "50%", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", ...flexCenter, zIndex: 40, cursor: "pointer" }}
      >
        <Plus size={28} />
      </button>

      {/* MODAL NOVO CLIENTE */}
      {isNewTabModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.5)", ...flexCenter, padding: "1rem", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", width: "100%", maxWidth: "400px", borderRadius: "1.5rem", padding: "1.5rem", boxSizing: "border-box" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1rem" }}>Novo Cliente</h2>
            <form onSubmit={handleCreateTab} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Nome do Cliente</label>
                <input 
                  required 
                  autoFocus
                  style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "0.75rem", boxSizing: "border-box" }} 
                  value={newCustomerName} 
                  onChange={e => setNewCustomerName(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Telefone</label>
                <input 
                  style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "0.75rem", boxSizing: "border-box" }} 
                  value={newCustomerPhone} 
                  onChange={e => setNewCustomerPhone(e.target.value)} 
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
                <button type="button" onClick={() => setIsNewTabModalOpen(false)} style={{ flex: 1, padding: "0.75rem", color: "#64748b", fontWeight: 700, background: "none", border: "none" }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, backgroundColor: "#7c3aed", color: "white", borderRadius: "0.75rem", padding: "0.75rem", fontWeight: 700, border: "none" }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LANÇAR PEDIDO (FULL SCREEN MOBILE) */}
      {isAddOrderModalOpen && selectedTab && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "white", display: "flex", flexDirection: "column" }}>
          <header style={{ padding: "1rem", borderBottom: "1px solid #e2e8f0", ...flexBetween }}>
            <button onClick={() => { setIsAddOrderModalOpen(false); setCart([]); }} style={{ background: "none", border: "none", padding: "0.5rem" }}><X size={24} /></button>
            <h2 style={{ fontWeight: 800, fontSize: "1.125rem", margin: 0 }}>Lançar: {selectedTab.customerName}</h2>
            <div style={{ width: "40px" }}></div>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {products.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "1rem", padding: "1rem", textAlign: "left", cursor: "pointer", transition: "background 0.1s" }}
                >
                  <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.category || 'Geral'}</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem 0" }}>{p.name}</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 800, color: "#7c3aed", margin: 0 }}>R$ {p.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "white", borderTop: "1px solid #e2e8f0", boxShadow: "0 -4px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ marginBottom: "1rem", maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {cart.map(item => (
                <div key={item.productId} style={{ ...flexBetween, backgroundColor: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
                  <span>{item.quantity}x {item.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontWeight: 700 }}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.productId)} style={{ color: "#ef4444", background: "none", border: "none" }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ ...flexBetween, marginBottom: "1rem" }}>
              <span style={{ color: "#64748b", fontWeight: 600 }}>Total do Lançamento</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
                R$ {cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}
              </span>
            </div>

            <button 
              onClick={handleAddOrder}
              disabled={cart.length === 0}
              style={{ width: "100%", backgroundColor: "#1e293b", color: "white", padding: "1.25rem", borderRadius: "1rem", fontSize: "1.125rem", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: cart.length === 0 ? 0.5 : 1 }}
            >
              Confirmar e Lançar <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

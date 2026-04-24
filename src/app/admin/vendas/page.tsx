"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Filter, 
  ArrowUpRight, 
  ChevronRight,
  Package,
  CreditCard,
  Banknote,
  MoreVertical,
  Zap
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";
import { createSale, getSales } from "@/actions/retail";
import { prisma } from "@/lib/prisma"; // Note: Use client-side fetch or another action for products

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");

  useEffect(() => {
    getSales().then(list => {
      setSales(list);
      setLoading(false);
    });
  }, []);

  const handleFinalize = async () => {
    // Simulação de venda de um item fixo por enquanto (já que não temos lista de produtos fácil aqui)
    // Em um sistema real, o usuário escolheria os produtos do carrinho
    const mockItems = [{ productId: "item-default", quantity: 1, price: 49.90 }];
    
    const res = await createSale({
      customerName,
      paymentMethod,
      items: mockItems
    });

    if (res.success) {
      alert("Venda registrada no banco de dados!");
      setIsModalOpen(false);
      getSales().then(setSales);
      setCustomerName("");
    }
  };

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);

  if (loading) return <div className="p-8">Carregando Vendas...</div>;

  return (
    <div className="animate-fade-in">
      {/* Modal Nova Venda (PDV) */}
      {isModalOpen && (
        <div className="modal-overlay flex-center p-4" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 10, 15, 0.9)', zIndex: 1000, backdropFilter: 'blur(12px)' }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '550px' }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3">Nova Venda (PDV)</h2>
              <button className="btn-circle btn-sm" onClick={() => setIsModalOpen(false)}>
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="input-group">
                <label className="input-label">Nome do Cliente (Opcional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Consumidor Final" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Método de Pagamento</label>
                <select className="input-field" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão de Crédito/Débito</option>
                  <option value="DINHEIRO">Dinheiro</option>
                </select>
              </div>
              
              <div className="bg-bg-muted p-4 rounded-2xl border border-border">
                <p className="text-xs font-bold text-muted uppercase mb-3 tracking-widest">Carrinho</p>
                <div className="space-y-2">
                  <div className="flex-between text-sm">
                    <span className="text-primary font-medium">1x Item de Teste</span>
                    <span className="font-bold">R$ 49,90</span>
                  </div>
                </div>
              </div>

              <div className="flex-between pt-4 border-top">
                <span className="text-sm font-bold text-muted uppercase">Total a Pagar</span>
                <span className="text-3xl font-black text-accent">R$ 49,90</span>
              </div>
            </div>

            <div className="p-6 bg-bg-surface border-top flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1 py-4" onClick={handleFinalize}>Finalizar Venda</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <ShoppingCart size={32} className="text-accent" />
            Vendas e Pedidos
          </h1>
          <p className="text-muted">Gerencie as transações comerciais da sua loja.</p>
        </div>
        <button className="btn btn-primary px-6" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Nova Venda (PDV)
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid-4 mb-8">
        <div className="card-flat">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Total faturado</p>
          <div className="flex-between">
            <p className="text-h2">R$ {totalRevenue.toLocaleString()}</p>
            <ArrowUpRight size={20} className="text-success" />
          </div>
        </div>
        <div className="card-flat">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Vendas Realizadas</p>
          <p className="text-h2">{sales.length}</p>
        </div>
        <div className="card-flat">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Ticket Médio</p>
          <p className="text-h2">R$ {sales.length ? (totalRevenue / sales.length).toFixed(2) : "0,00"}</p>
        </div>
        <div className="card-flat">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Itens Vendidos</p>
          <p className="text-h2">{sales.reduce((acc, s) => acc + (s.items?.length || 0), 0)}</p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="surface overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="group hover:bg-bg-muted/30">
                  <td className="text-sm">{new Date(s.createdAt).toLocaleString()}</td>
                  <td>
                    <span className="font-medium">{s.customerName || "Consumidor Final"}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-muted" />
                      <span className="text-sm">{s.items?.length || 0} itens</span>
                    </div>
                  </td>
                  <td className="font-bold">R$ {s.total.toFixed(2)}</td>
                  <td>
                    <div className="flex items-center gap-2 text-xs">
                      {s.paymentMethod === 'PIX' ? <Zap size={14} className="text-accent" /> : 
                       s.paymentMethod === 'CARTAO' ? <CreditCard size={14} className="text-info" /> : 
                       <Banknote size={14} className="text-success" />}
                      {s.paymentMethod}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${s.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                      {s.status === 'COMPLETED' ? 'Concluído' : 'Pendente'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-icon btn-sm"><ChevronRight size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    Nenhuma venda registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { 
  Boxes, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowDown, 
  ArrowUp,
  Package,
  RefreshCw,
  MoreVertical,
  Edit
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";

export default function StockPage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const inventory = [
    { id: 1, name: "Cabo USB-C Premium 2m", sku: "CAB-001", stock: 45, minStock: 10, category: "Acessórios", price: 49.90 },
    { id: 2, name: "Carregador Turbo 20W", sku: "PWR-020", stock: 4, minStock: 15, category: "Energia", price: 89.00 },
    { id: 3, name: "Fone Bluetooth AirDots", sku: "AUD-112", stock: 12, minStock: 5, category: "Áudio", price: 159.00 },
    { id: 4, name: "Película de Vidro S23", sku: "PL-S23", stock: 0, minStock: 20, category: "Proteção", price: 25.00 },
  ];

  if (loading) return <div className="p-8">Carregando Estoque...</div>;

  return (
    <div className="animate-fade-in">
      {/* Modal Entrada de Estoque */}
      {isModalOpen && (
        <div className="modal-overlay flex-center" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="surface p-8 rounded-2xl w-full max-w-[500px] animate-in">
            <h2 className="text-h2 mb-6">Entrada de Mercadoria</h2>
            <div className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Produto</label>
                <select className="input-field">
                  <option>Cabo USB-C Premium 2m</option>
                  <option>Carregador Turbo 20W</option>
                  <option>Fone Bluetooth AirDots</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Quantidade de Entrada</label>
                <input type="number" className="input-field" placeholder="Ex: 50" />
              </div>
              <div className="input-group">
                <label className="input-label">Custo Unitário (R$)</label>
                <input type="text" className="input-field" placeholder="0,00" />
              </div>
              <div className="mt-4 flex gap-3">
                <button className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={() => { alert("Estoque atualizado com sucesso!"); setIsModalOpen(false); }}>Confirmar Entrada</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Boxes size={32} className="text-accent" />
            Controle de Estoque
          </h1>
          <p className="text-muted">Monitore níveis de inventário e gerencie reposições.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary">
            <RefreshCw size={18} />
            Sincronizar
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Entrada de Estoque
          </button>
        </div>
      </div>

      {/* Inventory Alerts */}
      <div className="grid-3 mb-8">
        <div className="card-flat border-left-danger bg-danger/5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={18} className="text-danger" />
            <span className="text-xs font-bold uppercase text-danger tracking-widest">Esgotado</span>
          </div>
          <p className="text-h2">1 item</p>
          <p className="text-[10px] text-muted">Película de Vidro S23</p>
        </div>
        <div className="card-flat border-left-warning bg-warning/5">
          <div className="flex items-center gap-3 mb-2">
            <ArrowDown size={18} className="text-warning" />
            <span className="text-xs font-bold uppercase text-warning tracking-widest">Estoque Baixo</span>
          </div>
          <p className="text-h2">1 item</p>
          <p className="text-[10px] text-muted">Carregador Turbo 20W</p>
        </div>
        <div className="card-flat border-left-success">
          <div className="flex items-center gap-3 mb-2">
            <Package size={18} className="text-success" />
            <span className="text-xs font-bold uppercase text-muted tracking-widest">Valor em Estoque</span>
          </div>
          <p className="text-h2">R$ 12.450,00</p>
          <p className="text-[10px] text-muted">Total de 452 unidades</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="surface p-4 mb-6">
        <div className="input-wrapper">
          <Search size={18} className="input-icon" />
          <input type="text" placeholder="Buscar por produto, SKU ou categoria..." className="input-field with-icon" />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="surface overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Produto / SKU</th>
                <th>Categoria</th>
                <th>Qtd. Atual</th>
                <th>Mínimo</th>
                <th>Preço Unit.</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-bg-muted/30 transition-colors">
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold">{item.name}</span>
                      <span className="text-[10px] text-muted">SKU: {item.sku}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm px-2 py-1 bg-bg-muted rounded text-muted font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="font-bold">
                    <span className={item.stock <= item.minStock ? 'text-danger' : ''}>
                      {item.stock} un
                    </span>
                  </td>
                  <td className="text-muted text-sm">{item.minStock} un</td>
                  <td className="font-medium text-sm">R$ {item.price.toFixed(2)}</td>
                  <td>
                    {item.stock === 0 ? (
                      <span className="badge badge-danger">Sem Estoque</span>
                    ) : item.stock <= item.minStock ? (
                      <span className="badge badge-warning">Repor Urgente</span>
                    ) : (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-icon btn-sm" title="Editar"><Edit size={16} /></button>
                      <button className="btn btn-icon btn-sm" title="Mais"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

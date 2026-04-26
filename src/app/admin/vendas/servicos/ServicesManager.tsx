"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag, Plus, Edit, Trash2, X, Tag, Package,
  ToggleLeft, ToggleRight, Clock, Search
} from "lucide-react";
import { getServices, createService, updateService, deleteService } from "@/actions/sales";

const TYPE_MAP: Record<string, { label: string; badge: string }> = {
  AVULSO: { label: "Avulso", badge: "badge-info"    },
  PACOTE: { label: "Pacote", badge: "badge-accent"  },
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const EMPTY_FORM = {
  name: "", description: "", category: "Fisioterapia",
  type: "AVULSO", price: "", sessions: "1", validityDays: "", active: true,
};

export default function ServicesManager() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);

  const refresh = async () => {
    setLoading(true);
    setServices(await getServices());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...EMPTY_FORM }); setModal(true); };
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      name: s.name, description: s.description ?? "",
      category: s.category, type: s.type,
      price: s.price.toString(), sessions: s.sessions.toString(),
      validityDays: s.validityDays?.toString() ?? "",
      active: s.active,
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = {
      name: form.name, description: form.description,
      category: form.category, type: form.type,
      price: parseFloat(form.price) || 0,
      sessions: parseInt(form.sessions) || 1,
      validityDays: form.validityDays ? parseInt(form.validityDays) : undefined,
      active: form.active,
    };
    if (editId) {
      await updateService(editId, payload);
    } else {
      await createService(payload);
    }
    setSaving(false);
    setModal(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja desativar este serviço?")) return;
    await deleteService(id);
    refresh();
  };

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* ─── Modal ─── */}
      {modal && (
        <div className="modal-overlay flex-center" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(10,10,15,0.85)", zIndex: 1000, backdropFilter: "blur(10px)" }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3">{editId ? "Editar Serviço" : "Novo Serviço / Pacote"}</h2>
              <button className="btn-circle btn-sm" onClick={() => setModal(false)}>
                <Plus size={18} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="input-group">
                <label className="input-label">Nome *</label>
                <input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Avaliação Fisioterapêutica, Pacote 10 Sessões..." />
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Tipo *</label>
                  <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value, sessions: e.target.value === "AVULSO" ? "1" : form.sessions})}>
                    <option value="AVULSO">Serviço Avulso</option>
                    <option value="PACOTE">Pacote de Sessões</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Categoria</label>
                  <input className="input-field" list="cats" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                  <datalist id="cats">
                    {["Fisioterapia", "Pilates", "RPG", "Hidroterapia", "Avaliação", "Outros"].map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" className="input-field" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0,00" />
                </div>
                <div className="input-group">
                  <label className="input-label">Qtd. de Sessões</label>
                  <input type="number" min="1" className="input-field" value={form.sessions} disabled={form.type === "AVULSO"}
                    onChange={e => setForm({...form, sessions: e.target.value})} />
                </div>
              </div>
              {form.type === "PACOTE" && (
                <div className="input-group">
                  <label className="input-label">Validade (dias) — opcional</label>
                  <input type="number" min="1" className="input-field" value={form.validityDays} onChange={e => setForm({...form, validityDays: e.target.value})} placeholder="Ex: 90" />
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Descrição</label>
                <textarea className="input-field" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detalhes do serviço ou pacote..." />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg hover:bg-bg-muted transition-colors">
                <div onClick={() => setForm({...form, active: !form.active})} className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.active ? "bg-success" : "bg-border"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-sm font-medium">{form.active ? "Ativo — aparece no fluxo de venda" : "Inativo — oculto do fluxo de venda"}</span>
              </label>
            </div>
            <div className="p-6 border-top bg-bg-surface flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Serviço"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <ShoppingBag size={32} className="text-accent" />
            Catálogo de Serviços
          </h1>
          <p className="text-muted">Gerencie os serviços avulsos e pacotes de sessões oferecidos pela clínica.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid-3 mb-8">
        <div className="card stat-card">
          <div className="stat-header">
            <div><p className="stat-label">Total de Serviços</p><p className="stat-value">{services.length}</p></div>
            <div className="stat-icon-wrap primary"><Tag size={20} /></div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-header">
            <div><p className="stat-label">Pacotes</p><p className="stat-value">{services.filter(s => s.type === "PACOTE").length}</p></div>
            <div className="stat-icon-wrap success"><Package size={20} /></div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-header">
            <div><p className="stat-label">Ativos</p><p className="stat-value">{services.filter(s => s.active).length}</p></div>
            <div className="stat-icon-wrap warning"><ToggleRight size={20} /></div>
          </div>
        </div>
      </div>

      {/* ─── Search ─── */}
      <div className="flex-between mb-4">
        <div className="input-wrapper" style={{ minWidth: 320 }}>
          <Search size={14} className="input-icon" />
          <input className="input-field input-sm with-icon" placeholder="Pesquisar por nome ou categoria..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-muted">Carregando serviços...</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Sessões</th>
                  <th>Validade</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description && <p className="text-xs text-muted">{s.description}</p>}
                      </div>
                    </td>
                    <td><span className="text-sm text-muted">{s.category}</span></td>
                    <td><span className={`badge ${TYPE_MAP[s.type]?.badge ?? "badge-neutral"}`}>{TYPE_MAP[s.type]?.label ?? s.type}</span></td>
                    <td className="text-center font-medium">{s.sessions}</td>
                    <td className="text-sm text-muted">
                      {s.validityDays ? (
                        <span className="flex items-center gap-1"><Clock size={13} />{s.validityDays}d</span>
                      ) : "—"}
                    </td>
                    <td className="font-semibold">{fmt(s.price)}</td>
                    <td>
                      <span className={`badge ${s.active ? "badge-success" : "badge-danger"}`}>
                        {s.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon" onClick={() => openEdit(s)} title="Editar"><Edit size={16} /></button>
                        <button className="btn-icon text-danger" onClick={() => handleDelete(s.id)} title="Desativar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-bg-muted rounded-full flex-center mx-auto mb-4 opacity-30">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="text-h3 text-muted">Nenhum serviço cadastrado</h3>
                <p className="text-sm text-muted mb-6">Cadastre os serviços e pacotes que a clínica oferece.</p>
                <button className="btn btn-primary" onClick={openNew}><Plus size={18} /> Criar Serviço</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Building2, 
  DollarSign, 
  PieChart, 
  ShieldCheck,
  Globe,
  Settings2,
  Stethoscope,
  ChefHat,
  ShoppingBag,
  ArrowRight
} from "lucide-react";
import { createTenant, toggleTenantStatus, deleteTenant } from "@/actions/platform";

export default function PlatformDashboard({ stats }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    nicheId: stats.niches?.[0]?.id || "",
    planId: stats.planStats?.[0]?.id || "",
    adminName: "",
    adminUser: "",
    adminPass: ""
  });

  const openEdit = (tenant: any) => {
    setEditingId(tenant.id);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      nicheId: tenant.nicheId,
      planId: tenant.planId,
      adminName: tenant.users[0]?.user?.name || "",
      adminUser: tenant.users[0]?.user?.username || "",
      adminPass: "" // Não carregar senha por segurança
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: "", slug: "", nicheId: stats.niches?.[0]?.id || "", planId: stats.planStats?.[0]?.id || "",
      adminName: "", adminUser: "", adminPass: ""
    });
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    
    let res;
    if (editingId) {
      const { updateTenant } = await import("@/actions/platform");
      res = await updateTenant(editingId, formData as any);
    } else {
      res = await createTenant(formData as any);
    }

    if (res.success) {
      alert(editingId ? "Cliente atualizado!" : "Cliente criado com sucesso!");
      window.location.reload();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  const getNicheIcon = (code: string) => {
    if (code === 'PHYSIOTHERAPY') return <Stethoscope size={16} />;
    if (code === 'RESTAURANT') return <ChefHat size={16} />;
    if (code === 'RETAIL') return <ShoppingBag size={16} />;
    return <Globe size={16} />;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <ShieldCheck size={32} className="text-accent" />
            Platform Master Admin
          </h1>
          <p className="text-muted">Visão geral financeira e operacional da plataforma SaaS.</p>
        </div>
        <button className="btn btn-primary shadow-lg" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Implantar Novo Cliente
        </button>
      </div>

      {/* Stats Grid - Foco Financeiro */}
      <div className="grid-12 gap-6 mb-8">
        <div className="col-span-8 grid-2 gap-6">
          <div className="card bg-accent text-white border-none shadow-xl">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Faturamento Mensal (MRR)</p>
            <div className="flex-between items-end">
              <p className="text-4xl font-black">R$ {stats.mrr.toLocaleString()}</p>
              <DollarSign size={40} className="opacity-20" />
            </div>
            <div className="mt-4 pt-4 border-top border-white/10 flex gap-4 text-xs">
              <span>{stats.activeClients} Clientes Ativos</span>
              <span>•</span>
              <span>Ticket Médio: R$ {(stats.mrr / (stats.activeClients || 1)).toFixed(2)}</span>
            </div>
          </div>

          <div className="card">
            <p className="text-label mb-4">Receita por Plano</p>
            <div className="space-y-3">
              {stats.planStats.map((p: any) => (
                <div key={p.id} className="flex-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    {p.name}
                  </span>
                  <span className="font-bold">R$ {p.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-4 card flex flex-col justify-center">
          <p className="text-label mb-2 text-center">Distribuição de Clientes</p>
          <div className="flex-center py-4">
            <div className="relative w-32 h-32 rounded-full border-8 border-accent flex-center">
              <div className="text-center">
                <p className="text-2xl font-black">{stats.totalClients}</p>
                <p className="text-[10px] uppercase font-bold text-muted">Total</p>
              </div>
            </div>
          </div>
          <div className="grid-2 mt-4 text-[10px] uppercase font-bold text-muted gap-2">
            <div className="bg-bg-muted p-2 rounded text-center">Ativos: {stats.activeClients}</div>
            <div className="bg-bg-muted p-2 rounded text-center">Inativos: {stats.totalClients - stats.activeClients}</div>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="surface overflow-hidden shadow-sm">
        <div className="p-6 border-bottom bg-bg-surface flex-between">
          <h3 className="font-bold">Gestão de Inquilinos (Tenants)</h3>
          <div className="flex gap-2">
            <div className="input-wrapper">
              <Settings2 size={14} className="input-icon" />
              <input type="text" className="input-field input-sm with-icon" placeholder="Filtrar clientes..." />
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Empresa / Nicho</th>
                <th>Plano</th>
                <th>Admin Responsável</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stats.tenants.map((t: any) => (
                <tr key={t.id} className="hover:bg-bg-muted/30 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="btn-circle btn-sm bg-accent/10 text-accent border border-accent/20">
                        {getNicheIcon(t.niche?.code)}
                      </div>
                      <div>
                        <p className="font-bold">{t.name}</p>
                        <p className="text-[10px] text-muted font-mono">/{t.slug} • {t.niche?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{t.plan.name}</span>
                  </td>
                  <td>
                    <div className="text-sm">
                      <p className="font-medium">{t.users[0]?.user?.name || "N/A"}</p>
                      <p className="text-xs text-muted">@{t.users[0]?.user?.username}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {t.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        className="btn btn-icon text-accent hover:bg-accent/10"
                        onClick={() => openEdit(t)}
                        title="Editar Cliente"
                      >
                        <Settings2 size={16} />
                      </button>
                      <button 
                        className={`btn btn-icon ${t.status === 'ACTIVE' ? 'text-warning' : 'text-success'}`}
                        onClick={() => toggleTenantStatus(t.id, t.status).then(() => window.location.reload())}
                        title={t.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                      >
                        {t.status === 'ACTIVE' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button 
                        className="btn btn-icon text-danger hover:bg-danger/10"
                        onClick={() => {
                          if (confirm("Deseja realmente excluir este cliente?")) {
                            deleteTenant(t.id).then(() => window.location.reload());
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo/Editar Cliente */}
      {isModalOpen && (
        <div className="modal-overlay flex-center p-4" style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(10, 10, 15, 0.95)', zIndex: 1000, backdropFilter: 'blur(16px)'
        }}>
          <div className="modal-content animate-fade-in shadow-2xl" style={{ 
            width: '100%', maxWidth: '900px', maxHeight: '95vh',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div className="p-8 border-bottom flex-between bg-bg-surface">
              <div>
                <h2 className="text-h2">{editingId ? "Editar Cliente SaaS" : "Implantar Novo Cliente"}</h2>
                <p className="text-muted text-sm">{editingId ? "Atualize os dados e acessos da instância." : "Configure uma nova instância isolada para o SaaS."}</p>
              </div>
              <button className="btn-circle btn-sm" onClick={closeModal}><XCircle size={24} /></button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar bg-bg-surface/50" style={{ flex: 1 }}>
              <div className="space-y-10">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Building2 className="text-accent" size={20} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Informações da Empresa</h3>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Nome Fantasia *</label>
                      <input 
                        required
                        type="text" 
                        className="input-field" 
                        placeholder="Ex: Restaurante do Chef" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">URL Slug (Identificador) *</label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted font-mono">/</span>
                        <input 
                          required
                          type="text" 
                          className="input-field" 
                          placeholder="restaurante-chef" 
                          value={formData.slug}
                          onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid-2 mt-6">
                    <div className="input-group">
                      <label className="input-label">Nicho de Atuação *</label>
                      <select className="input-field" value={formData.nicheId} onChange={e => setFormData({...formData, nicheId: e.target.value})}>
                        {stats.niches.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Plano de Assinatura *</label>
                      <select className="input-field" value={formData.planId} onChange={e => setFormData({...formData, planId: e.target.value})}>
                        {stats.planStats.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                <hr className="border-border opacity-50" />

                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <ShieldCheck className="text-primary" size={20} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Credenciais do Administrador</h3>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Nome do Gestor *</label>
                      <input 
                        required
                        type="text" 
                        className="input-field" 
                        placeholder="Nome completo do responsável" 
                        value={formData.adminName}
                        onChange={e => setFormData({...formData, adminName: e.target.value})}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">E-mail / Usuário de Acesso *</label>
                      <input 
                        required
                        type="text" 
                        className="input-field" 
                        placeholder="admin.usuario" 
                        value={formData.adminUser}
                        onChange={e => setFormData({...formData, adminUser: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="input-group mt-6">
                    <label className="input-label">Senha {editingId ? "(Deixe em branco para não alterar)" : "Inicial de Acesso *"}</label>
                    <input 
                      required={!editingId}
                      type="password" 
                      className="input-field" 
                      placeholder={editingId ? "••••••••" : "Defina uma senha segura"}
                      value={formData.adminPass}
                      onChange={e => setFormData({...formData, adminPass: e.target.value})}
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className="p-8 bg-bg-surface border-top flex gap-4">
              <button type="button" className="btn btn-secondary flex-1" onClick={closeModal}>Cancelar</button>
              <button 
                className="btn btn-primary flex-1 py-4 text-lg font-bold" 
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? "Salvando..." : (editingId ? "Salvar Alterações" : "Confirmar e Implantar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

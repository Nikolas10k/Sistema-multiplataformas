"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { createUser, updateUser, deleteUser } from "@/actions/admin-users";
import { useRouter } from "next/navigation";

export default function UserManager({ initialUsers, niche }: { initialUsers: any[], niche: string }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("WAITER");
  const [permissions, setPermissions] = useState<string[]>([]);

  const AVAILABLE_PERMISSIONS = [
    { path: "/admin/pacientes", name: "Pacientes", nicheOnly: "PHYSIOTHERAPY" },
    { path: "/admin/fisioterapia/prontuario", name: "Prontuários", nicheOnly: "PHYSIOTHERAPY" },
    { path: "/admin/agenda", name: "Agenda", nicheOnly: "PHYSIOTHERAPY" },
    { path: "/pdv", name: "PDV (Mesas / Balcão)", nicheOnly: "RESTAURANT" },
    { path: "/admin/vendas", name: "Vendas e Caixas" },
    { path: "/admin/produtos", name: "Estoque / Catálogo" },
    { path: "/admin/vendas/servicos", name: "Serviços", nicheOnly: "PHYSIOTHERAPY" },
    { path: "/admin/relatorios", name: "Relatórios" },
    { path: "/admin/configuracoes", name: "Configurações" }
  ];

  const openModal = (user?: any) => {
    if (user) {
      setEditingId(user.id);
      setName(user.name);
      setUsername(user.username);
      setPassword(""); // Don't show existing password
      setRole(user.role);
      setPermissions(user.permissions || []);
    } else {
      setEditingId(null);
      setName("");
      setUsername("");
      setPassword("");
      setRole("WAITER");
      setPermissions([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      name,
      username,
      password,
      role,
      permissions
    };


    let res;
    if (editingId) {
      res = await updateUser(editingId, data);
    } else {
      res = await createUser(data);
    }

    setLoading(false);
    if (res.success) {
      closeModal();
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este funcionário? O acesso será revogado imediatamente.")) {
      const res = await deleteUser(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message);
      }
    }
  };

  const getRoleBadge = (r: string) => {
    if (r === "ADMIN") return <span className="badge badge-primary">Administrador</span>;
    if (r === "CASHIER") return <span className="badge badge-success">Caixa</span>;
    if (r === "WAITER") return <span className="badge badge-warning">Garçom</span>;
    return <span className="badge">{r}</span>;
  };

  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <h1 className="text-h2">Equipe</h1>
          <p className="text-muted text-sm mt-1">Gerencie os acessos e funcionários do restaurante.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={18} />
            Novo Funcionário
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>Usuário (Login)</th>
                <th>Cargo / Perfil</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {initialUsers.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.username}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    <div className="flex" style={{ gap: '0.5rem' }}>
                      <button className="btn-icon" title="Editar" onClick={() => openModal(u)}>
                        <Edit size={18} />
                      </button>
                      <button className="btn-icon text-danger" title="Excluir" onClick={() => handleDelete(u.id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {initialUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted">
                    Nenhum funcionário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay flex-center p-4" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(10, 10, 15, 0.9)', zIndex: 100, backdropFilter: 'blur(12px)'
        }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '550px', maxHeight: '95vh' }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3">{editingId ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
              <button className="btn-circle btn-sm" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="input-group">
                  <label className="input-label">Nome Completo *</label>
                  <input required type="text" className="input-field" placeholder="Ex: João da Silva" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div className="input-group">
                  <label className="input-label">Cargo / Nível de Acesso *</label>
                  <select required className="input-field" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="WAITER">Garçom / Atendimento</option>
                    <option value="CASHIER">Caixa / Balcão</option>
                    <option value="ADMIN">Administrador (Acesso Total)</option>
                  </select>
                </div>
                
                <div className="bg-bg-muted p-5 rounded-2xl border border-border">
                  <h3 className="text-xs font-bold uppercase text-accent mb-4 tracking-widest">Credenciais de Acesso</h3>

                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Usuário *</label>
                      <input required type="text" className="input-field" placeholder="joao.silva" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Senha {editingId ? '(Opcional)' : '*'}</label>
                      <input 
                        required={!editingId} 
                        type="password" 
                        className="input-field" 
                        placeholder={editingId ? "Manter atual" : "••••••••"} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {role !== "ADMIN" && (
                  <div className="bg-bg-muted p-5 rounded-2xl border border-border">
                    <h3 className="text-xs font-bold uppercase text-accent mb-4 tracking-widest">Permissões de Acesso</h3>
                    <p className="text-xs text-muted mb-4">Selecione quais telas este funcionário poderá acessar. (Opcional)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {AVAILABLE_PERMISSIONS.filter(p => !p.nicheOnly || p.nicheOnly === niche).map(p => (
                        <label key={p.path} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-surface transition-colors">
                          <input 
                            type="checkbox" 
                            className="rounded border-border text-accent focus:ring-accent"
                            checked={permissions.includes(p.path)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPermissions([...permissions, p.path]);
                              } else {
                                setPermissions(permissions.filter(x => x !== p.path));
                              }
                            }}
                          />
                          <span className="text-sm font-medium">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>

            <div className="p-6 bg-bg-surface border-top flex gap-3">
              <button type="button" className="btn btn-secondary flex-1" onClick={closeModal}>Cancelar</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

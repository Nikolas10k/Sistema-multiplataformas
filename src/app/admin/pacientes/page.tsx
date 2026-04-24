"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  ChevronRight,
  Activity,
  FileText
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";
import { getTerm } from "@/lib/dictionary";
import { createPatient, getPatients } from "@/actions/clinical";
import Link from "next/link";

export default function PatientsPage() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newPatient, setNewPatient] = useState({ name: "", phone: "", document: "" });

  useEffect(() => {
    Promise.all([
      getMyTenantContext(),
      getPatients()
    ]).then(([ctx, list]) => {
      setContext(ctx);
      setPatients(list);
      setLoading(false);
    });
  }, []);

  const niche = context?.niche || 'GENERAL';
  const labelPatients = getTerm("patients", niche);
  const labelPatient = getTerm("customer", niche);

  const handleCreate = async () => {
    if (!newPatient.name) return;
    const res = await createPatient(newPatient);
    if (res.success) {
      setPatients([...patients, res.patient]);
      setIsModalOpen(false);
      setNewPatient({ name: "", phone: "", document: "" });
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8">Carregando {labelPatients}...</div>;

  return (
    <div className="animate-fade-in">
      {/* Modal Novo Paciente */}
      {isModalOpen && (
        <div className="modal-overlay flex-center p-4" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 10, 15, 0.9)', zIndex: 1000, backdropFilter: 'blur(12px)' }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3">Novo {labelPatient}</h2>
              <button className="btn-circle btn-sm" onClick={() => setIsModalOpen(false)}>
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="input-group">
                <label className="input-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Roberto Carlos" 
                  value={newPatient.name}
                  onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="(11) 99999-9999" 
                  value={newPatient.phone}
                  onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">CPF (Opcional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="000.000.000-00" 
                  value={newPatient.document}
                  onChange={e => setNewPatient({...newPatient, document: e.target.value})}
                />
              </div>
            </div>

            <div className="p-6 bg-bg-surface border-top flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={handleCreate}>Cadastrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1">{labelPatients}</h1>
          <p className="text-muted">Gerencie o cadastro de {labelPatients.toLowerCase()} do seu negócio.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Novo {labelPatient}
        </button>
      </div>

      {/* Stats e Filtros */}
      <div className="grid-3 mb-8">
        <div className="card-flat border-left-accent">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Total de {labelPatients}</p>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-accent" />
            <p className="text-h2">{patients.length}</p>
          </div>
        </div>
        <div className="card-flat border-left-success">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Ativos</p>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-success" />
            <p className="text-h2">{patients.filter(p => p.status === 'ACTIVE').length}</p>
          </div>
        </div>
        <div className="card-flat border-left-warning">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Com Prontuário</p>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-warning" />
            <p className="text-h2">{patients.length} <span className="text-xs opacity-50">/ {patients.length}</span></p>
          </div>
        </div>
      </div>

      <div className="surface p-4 mb-6 flex items-center gap-4">
        <div className="input-wrapper flex-1">
          <Search size={18} className="input-icon" />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou documento..." 
            className="input-field with-icon"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {/* Tabela de Pacientes */}
      <div className="surface overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Última Visita</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td className="font-bold">{patient.name}</td>
                  <td className="text-sm text-muted">{patient.phone || "Não informado"}</td>
                  <td>
                    <span className={`badge ${patient.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                      {patient.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/fisioterapia/prontuario/${patient.id}`} className="btn btn-secondary btn-sm">
                        Prontuário
                      </Link>
                      <button className="btn-icon">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted">
                    Nenhum {labelPatient.toLowerCase()} encontrado.
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

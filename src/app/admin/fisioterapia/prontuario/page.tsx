"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Plus, 
  History, 
  ChevronRight,
  Stethoscope,
  Activity,
  Calendar
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";
import { getClinicalRecords, createClinicalFile } from "@/actions/clinical";
import { getPatients } from "@/actions/clinical";
import Link from "next/link";

export default function ProntuarioListPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    Promise.all([
      getClinicalRecords(),
      getPatients()
    ]).then(([list, pList]) => {
      setRecords(list);
      setPatients(pList);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!selectedPatientId) return;
    const res = await createClinicalFile(selectedPatientId, { diagnosis });
    if (res.success) {
      alert("Ficha criada com sucesso!");
      setIsModalOpen(false);
      getClinicalRecords().then(setRecords);
    }
  };

  const filteredRecords = records.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.clinicalFiles[0]?.diagnosis && r.clinicalFiles[0].diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="p-8">Carregando Prontuários...</div>;

  return (
    <div className="animate-fade-in">
      {/* Modal Nova Ficha */}
      {isModalOpen && (
        <div className="modal-overlay flex justify-center items-start p-4 overflow-y-auto custom-scrollbar" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 10, 15, 0.9)', zIndex: 1000, backdropFilter: 'blur(12px)', paddingTop: '5vh', paddingBottom: '5vh' }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3">Nova Ficha Clínica</h2>
              <button className="btn-circle btn-sm" onClick={() => setIsModalOpen(false)}>
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="input-group">
                <label className="input-label">Selecionar Paciente</label>
                <select 
                  className="input-field" 
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Diagnóstico Principal (Opcional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Lombalgia, Pós-operatório..." 
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 bg-bg-surface border-top flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={handleCreate}>Criar Ficha</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <FileText size={32} className="text-accent" />
            Prontuário Eletrônico
          </h1>
          <p className="text-muted">Histórico clínico digital e evoluções dos pacientes.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="input-wrapper" style={{ minWidth: '300px' }}>
            <input 
              type="text" 
              className="input-field input-sm" 
              placeholder="Pesquisar por paciente ou diagnóstico..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Nova Ficha Clínica
          </button>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid-3 mb-8">
        <div className="card-flat border-left-accent">
          <div className="flex-between mb-2">
            <span className="text-xs font-bold uppercase text-muted">Prontuários Ativos</span>
            <Activity size={16} className="text-accent" />
          </div>
          <p className="text-h2">{records.length}</p>
        </div>
        <div className="card-flat border-left-success">
          <div className="flex-between mb-2">
            <span className="text-xs font-bold uppercase text-muted">Evoluções (Total)</span>
            <Stethoscope size={16} className="text-success" />
          </div>
          <p className="text-h2">--</p>
        </div>
        <div className="card-flat border-left-warning">
          <div className="flex-between mb-2">
            <span className="text-xs font-bold uppercase text-muted">Pendentes</span>
            <History size={16} className="text-warning" />
          </div>
          <p className="text-h2">0</p>
        </div>
      </div>

      {/* Records Table */}
      <div className="surface overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Último Diagnóstico</th>
                <th>Última Evolução</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r.id}>
                  <td className="font-bold">{r.name}</td>
                  <td>
                    <span className="badge badge-neutral">
                      {r.clinicalFiles[0]?.diagnosis || "Sem diagnóstico"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Calendar size={14} />
                      {r.evolutions[0] ? new Date(r.evolutions[0].evolutionDate).toLocaleDateString() : "Sem evoluções"}
                    </div>
                  </td>
                  <td className="text-right">
                    <Link href={`/admin/fisioterapia/prontuario/${r.id}`} className="btn btn-secondary btn-sm">
                      Abrir Prontuário
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted">
                    Nenhum prontuário registrado ainda.
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

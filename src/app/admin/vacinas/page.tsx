"use client";

import { useState, useEffect } from "react";
import { 
  Syringe, 
  Search, 
  Plus, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  PawPrint
} from "lucide-react";

export default function VacinasPage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados para o formulário automatizado
  const [protocol, setProtocol] = useState("ADULT"); // ADULT or PUPPY
  const [applyDate, setApplyDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDose, setNextDose] = useState("");

  const vacinas = [
    { id: 1, animal: "Rex", breed: "Golden Retriever", vaccine: "V10 + Raiva", date: "15/04/2026", next: "15/04/2027", status: "APPLIED" },
    { id: 2, animal: "Thor", breed: "Bulldog Francês", vaccine: "Gripe Canina", date: "10/04/2026", next: "10/10/2026", status: "APPLIED" },
    { id: 3, animal: "Mel", breed: "Siamês", vaccine: "V5 Felina", date: "---", next: "HOJE", status: "PENDING" },
    { id: 4, animal: "Luna", breed: "Calopsita", vaccine: "Polomavírus", date: "---", next: "25/04/2026", status: "SCHEDULED" },
  ];

  // Efeito para calcular data automaticamente
  useEffect(() => {
    if (!applyDate) return;
    
    const date = new Date(applyDate);
    if (protocol === "PUPPY") {
      date.setDate(date.getDate() + 21);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    
    setNextDose(date.toISOString().split('T')[0]);
  }, [applyDate, protocol]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-8">Carregando Vacinas...</div>;

  return (
    <div className="animate-fade-in p-4">
      {/* Modal de Registro */}
      {isModalOpen && (
        <div className="modal-overlay flex justify-center items-start p-4 overflow-y-auto" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(8px)', paddingTop: '10vh' }}>
          <div className="surface p-8 rounded-2xl w-full max-w-[500px] animate-fade-in">
            <div className="flex-between mb-6">
              <h2 className="text-h2">Registrar Vacinação</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="input-group">
                <label className="input-label">Tipo de Protocolo</label>
                <div className="grid-2 gap-2">
                  <button 
                    className={`btn btn-sm ${protocol === 'ADULT' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setProtocol('ADULT')}
                  >Reforço Anual (Adulto)</button>
                  <button 
                    className={`btn btn-sm ${protocol === 'PUPPY' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setProtocol('PUPPY')}
                  >Reforço 21 dias (Filhote)</button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Paciente (Animal)</label>
                <select className="input-field">
                  <option>Rex (Cão)</option>
                  <option>Mel (Gato)</option>
                  <option>Thor (Cão)</option>
                  <option>Luna (Ave)</option>
                </select>
              </div>
              
              <div className="input-group">
                <label className="input-label">Vacina / Imunizante</label>
                <input type="text" className="input-field" placeholder="Ex: V10, Antirrábica..." defaultValue={protocol === 'PUPPY' ? 'V10 (Dose Inicial)' : 'Reforço Anual V10 + Raiva'} />
              </div>

              <div className="grid-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Data de Aplicação</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={applyDate}
                    onChange={(e) => setApplyDate(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label flex-between">
                    Próximo Reforço
                    <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">Calculado</span>
                  </label>
                  <input 
                    type="date" 
                    className="input-field border-accent/30 bg-accent/5 font-bold text-accent" 
                    value={nextDose}
                    onChange={(e) => setNextDose(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Número do Lote</label>
                  <input type="text" className="input-field" placeholder="Ex: 098/24" />
                </div>
                <div className="input-group">
                  <label className="input-label">Laboratório</label>
                  <input type="text" className="input-field" placeholder="Ex: Zoetis, Virbac..." />
                </div>
              </div>

              <button className="btn btn-primary w-full py-4 mt-4" onClick={() => { alert(`Vacina registrada!\nProtocolo: ${protocol}\nPróximo reforço: ${new Date(nextDose).toLocaleDateString('pt-BR')}`); setIsModalOpen(false); }}>
                Confirmar Aplicação
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Syringe size={32} className="text-accent" />
            Controle de Vacinação
          </h1>
          <p className="text-muted">Acompanhe as doses aplicadas e próximos reforços.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Registrar Aplicação
        </button>
      </div>

      <div className="grid-12 gap-6">
        {/* Alertas */}
        <div className="col-span-12 grid-3 mb-2">
          <div className="card-flat border-left-danger bg-danger/5">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle size={18} className="text-danger" />
              <span className="text-xs font-black text-danger uppercase tracking-widest">Atrasadas</span>
            </div>
            <p className="text-h2">1</p>
            <p className="text-[10px] text-muted">Paciente: Mel (Gato)</p>
          </div>
          <div className="card-flat border-left-warning bg-warning/5">
            <div className="flex items-center gap-3 mb-2">
              <Clock size={18} className="text-warning" />
              <span className="text-xs font-black text-warning uppercase tracking-widest">Próximos 7 dias</span>
            </div>
            <p className="text-h2">1</p>
            <p className="text-[10px] text-muted">Paciente: Luna (Ave)</p>
          </div>
          <div className="card-flat border-left-success bg-success/5">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 size={18} className="text-success" />
              <span className="text-xs font-black text-success uppercase tracking-widest">Aplicadas (Mês)</span>
            </div>
            <p className="text-h2">12</p>
            <p className="text-[10px] text-muted">Meta: 20 aplicações</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="col-span-12 surface overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Vacina</th>
                  <th>Data Aplicação</th>
                  <th>Próximo Reforço</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vacinas.map(v => (
                  <tr key={v.id} className="hover:bg-bg-muted/30 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bg-muted flex-center text-muted">
                          <PawPrint size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{v.animal}</span>
                          <span className="text-[10px] text-muted">{v.breed}</span>
                        </div>
                      </div>
                    </td>
                    <td className="font-medium">{v.vaccine}</td>
                    <td className="text-sm text-muted">{v.date}</td>
                    <td>
                      <div className={`flex items-center gap-2 text-sm font-bold ${v.next === 'HOJE' ? 'text-danger' : ''}`}>
                        <Calendar size={14} /> {v.next}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${v.status === 'APPLIED' ? 'badge-success' : (v.status === 'PENDING' ? 'badge-danger animate-pulse' : 'badge-warning')}`}>
                        {v.status === 'APPLIED' ? 'Aplicada' : (v.status === 'PENDING' ? 'Pendente' : 'Agendada')}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-secondary btn-sm">Detalhes</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

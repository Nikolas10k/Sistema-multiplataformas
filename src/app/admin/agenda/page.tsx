"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Activity,
  CheckCircle2
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";
import { getTerm } from "@/lib/dictionary";
import Link from "next/link";

export default function AgendaPage() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(23);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [sessions, setSessions] = useState<Record<number, any[]>>({
    21: [
      { id: 101, time: "09:00", patient: "Maria Silva", service: "Avaliação", status: "CONFIRMED" },
      { id: 102, time: "14:00", patient: "José Santos", service: "Sessão 05/10", status: "CONFIRMED" },
    ],
    22: [
      { id: 201, time: "10:00", patient: "Bruna Lima", service: "Drenagem", status: "CONFIRMED" },
      { id: 202, time: "11:00", patient: "Fernando Souza", service: "Sessão 02/10", status: "WAITING" },
      { id: 203, time: "16:00", patient: "Clara Mendes", service: "Revisão", status: "PENDING" },
    ],
    23: [
      { id: 301, time: "08:00", patient: "João Silva", service: "Fisioterapia Traumato", status: "CONFIRMED" },
      { id: 302, time: "09:00", patient: "Maria Oliveira", service: "Pilates Clínico", status: "WAITING" },
      { id: 303, time: "10:30", patient: "Carlos Pereira", service: "RPG", status: "CONFIRMED" },
      { id: 304, time: "14:00", patient: "Ana Costa", service: "Fisioterapia Traumato", status: "PENDING" },
      { id: 305, time: "16:30", patient: "Ricardo Nunes", service: "Sessão 08/12", status: "CONFIRMED" },
    ],
    24: [
      { id: 401, time: "08:30", patient: "Daniel Rocha", service: "Avaliação Postural", status: "CONFIRMED" },
      { id: 402, time: "15:00", patient: "Sonia Guedes", service: "Sessão 04/10", status: "PENDING" },
    ]
  });

  const [formData, setFormData] = useState({
    patient: "João Silva",
    time: "08:00",
    date: "2026-04-23"
  });
  
  useEffect(() => {
    getMyTenantContext().then(ctx => {
      setContext(ctx);
      setLoading(false);
    });
  }, []);

  const openNew = () => {
    setEditingSession(null);
    setFormData({ patient: "João Silva", time: "08:00", date: "2026-04-23" });
    setIsModalOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingSession(s);
    setFormData({ patient: s.patient, time: s.time, date: "2026-04-23" });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja realmente remover esta sessão?")) {
      const newSessions = { ...sessions };
      newSessions[selectedDate] = newSessions[selectedDate].filter(s => s.id !== id);
      setSessions(newSessions);
    }
  };

  const handleSave = () => {
    const newSessions = { ...sessions };
    if (editingSession) {
      newSessions[selectedDate] = newSessions[selectedDate].map(s => 
        s.id === editingSession.id ? { ...s, patient: formData.patient, time: formData.time } : s
      );
    } else {
      const newId = Math.random();
      if (!newSessions[selectedDate]) newSessions[selectedDate] = [];
      newSessions[selectedDate].push({
        id: newId,
        time: formData.time,
        patient: formData.patient,
        service: "Atendimento Geral",
        status: "PENDING"
      });
    }
    setSessions(newSessions);
    setIsModalOpen(false);
  };

  const niche = context?.niche || 'GENERAL';
  const labelSessao = getTerm("appointment", niche);
  const currentSessions = sessions[selectedDate] || [];

  if (loading) return <div className="p-8">Carregando Agenda...</div>;

  return (
    <div className="animate-fade-in p-4">
      {/* Modal Nova/Editar Sessão */}
      {isModalOpen && (
        <div className="modal-overlay flex justify-center items-start p-4 overflow-y-auto custom-scrollbar" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 10, 15, 0.9)', zIndex: 1000, backdropFilter: 'blur(12px)', paddingTop: '5vh', paddingBottom: '5vh' }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="p-6 border-bottom flex-between bg-bg-surface">
              <h2 className="text-h3">{editingSession ? "Editar " : "Nova "}{labelSessao}</h2>
              <button className="btn-circle btn-sm" onClick={() => setIsModalOpen(false)}>
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="input-group">
                <label className="input-label">Paciente</label>
                <select className="input-field" value={formData.patient} onChange={e => setFormData({...formData, patient: e.target.value})}>
                  <option>João Silva</option>
                  <option>Maria Oliveira</option>
                  <option>Carlos Pereira</option>
                  <option>Bruna Lima</option>
                  <option>Fernando Souza</option>
                </select>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Data</label>
                  <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Horário</label>
                  <input type="time" className="input-field" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-bg-surface border-top flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={handleSave}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <CalendarIcon size={28} className="text-accent" />
            Agenda de {labelSessao}s
          </h1>
          <p className="text-muted">Gestão estratégica de horários e pacientes.</p>
        </div>
        <button className="btn btn-primary px-6 py-3 shadow-md" onClick={openNew}>
          <Plus size={20} />
          Nova {labelSessao}
        </button>
      </div>

      <div className="grid-12">
        
        {/* LEFT: CALENDAR CONTROL */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="surface p-6 rounded-2xl shadow-sm border border-accent/5">
            <div className="flex-between mb-6">
              <div>
                <h3 className="text-h3">Abril 2026</h3>
                <p className="text-[10px] uppercase font-bold text-muted tracking-widest">Hoje: 23 de Abril</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-icon btn-sm"><ChevronLeft size={16} /></button>
                <button className="btn-icon btn-sm"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="grid-7 text-center mb-4">
              {['D','S','T','Q','Q','S','S'].map(d => (
                <span key={d} className="text-[10px] font-black text-muted opacity-50">{d}</span>
              ))}
            </div>

            <div className="grid-7">
              {[...Array(30)].map((_, i) => {
                const day = i + 1;
                const isSelected = selectedDate === day;
                const isToday = day === 23;
                const hasSessions = !!sessions[day];

                return (
                  <button 
                    key={day} 
                    onClick={() => setSelectedDate(day)}
                    className={`
                      h-10 flex flex-col items-center justify-center rounded-xl transition-all relative
                      ${isSelected ? 'bg-accent text-white font-bold shadow-md' : 'hover:bg-bg-muted'}
                      ${isToday && !isSelected ? 'border border-accent text-accent' : ''}
                    `}
                  >
                    <span className="text-sm">{day}</span>
                    {hasSessions && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-accent rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="surface p-6 rounded-2xl bg-bg-muted/30 border border-dashed border-border">
            <div className="flex items-center gap-3 mb-4 text-accent">
              <Activity size={18} />
              <h4 className="font-bold">Resumo do Dia</h4>
            </div>
            <div className="space-y-4">
              <div className="flex-between">
                <span className="text-sm text-muted">Total Marcado</span>
                <span className="text-h3">{currentSessions.length}</span>
              </div>
              <div className="flex gap-1 h-1 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: (currentSessions.length * 15) + '%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: TIMELINE */}
        <div className="col-span-8">
          <div className="surface rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-bottom bg-bg-surface flex-between">
              <div>
                <h3 className="text-h3">{selectedDate} de Abril, 2026</h3>
                <p className="text-xs text-muted">Cronograma de atendimentos clínicos</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm"><Filter size={14} /> Filtros</button>
              </div>
            </div>

            <div className="p-0">
              {currentSessions.length > 0 ? (
                <div className="divide-y">
                  {currentSessions.map((s) => (
                    <div key={s.id} className="p-6 flex gap-6 hover:bg-bg-muted/10 transition-colors group">
                      <div className="flex flex-col items-center min-w-[60px] pt-1">
                        <span className="text-xl font-bold tracking-tighter">{s.time}</span>
                        <div className="w-px flex-1 bg-border my-2 group-last:hidden"></div>
                      </div>
                      <div className="flex-1 bg-bg-surface border border-border p-5 rounded-2xl group-hover:border-accent/40 group-hover:shadow-md transition-all">
                        <div className="flex-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex-center border border-accent/20">
                              <User size={24} />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold">{s.patient}</h4>
                              <p className="text-xs text-muted uppercase font-bold tracking-widest">{s.service}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`
                              px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                              ${s.status === 'CONFIRMED' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}
                            `}>
                              {s.status === 'CONFIRMED' ? 'Confirmado' : 'Aguardando'}
                            </span>
                            {s.status === 'CONFIRMED' && <CheckCircle2 size={14} className="text-success" />}
                          </div>
                        </div>
                        <div className="flex gap-3 mt-4 pt-4 border-top">
                          <Link href={`/admin/fisioterapia/prontuario/${s.id}`} className="btn btn-secondary btn-sm flex-1">Prontuário</Link>
                          <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(s)}>Editar</button>
                          <button className="btn btn-danger btn-sm px-4" onClick={() => handleDelete(s.id)}>Remover</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-24 text-center">
                  <div className="w-20 h-20 bg-bg-muted rounded-full flex-center mx-auto mb-6 opacity-30">
                    <CalendarIcon size={40} />
                  </div>
                  <h3 className="text-h3 text-muted">Agenda Livre</h3>
                  <p className="text-sm text-muted mb-8">Não há compromissos para este dia.</p>
                  <button className="btn btn-primary px-8" onClick={openNew}>Agendar Novo Paciente</button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

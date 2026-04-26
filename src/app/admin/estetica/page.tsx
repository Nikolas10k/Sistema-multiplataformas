"use client";

import { useState, useEffect } from "react";
import { 
  Scissors, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  PawPrint,
  User,
  Droplets,
  Wind
} from "lucide-react";

export default function EsteticaPage() {
  const [loading, setLoading] = useState(true);

  const agendamentos = [
    { id: 1, animal: "Mel", breed: "Siamês", service: "Banho + Tosa Higiênica", time: "10:00", tutor: "João Silva", status: "WAITING", price: "R$ 85,00" },
    { id: 2, animal: "Rex", breed: "Golden Retriever", service: "Banho Completo + Hidratação", time: "11:30", tutor: "João Silva", status: "IN_PROGRESS", price: "R$ 120,00" },
    { id: 3, animal: "Thor", breed: "Bulldog Francês", service: "Corte de Unhas + Limpeza Ouvido", time: "14:00", tutor: "Maria Oliveira", status: "SCHEDULED", price: "R$ 45,00" },
  ];

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-8">Carregando Estética e Petshop...</div>;

  return (
    <div className="animate-fade-in p-4">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Scissors size={32} className="text-accent" />
            Agenda de Estética (Banho e Tosa)
          </h1>
          <p className="text-muted">Gerencie os serviços de petshop e estética animal.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} />
          Novo Agendamento
        </button>
      </div>

      <div className="grid-12 gap-6">
        {/* Kanban de Status Estética */}
        <div className="col-span-12 grid-3 gap-6">
          <div className="surface p-6 rounded-2xl border-left-warning bg-warning/5">
            <div className="flex-between mb-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-warning">Aguardando</h4>
              <Clock size={18} className="text-warning" />
            </div>
            <p className="text-h2">3</p>
            <p className="text-[10px] text-muted">Animais na recepção</p>
          </div>
          <div className="surface p-6 rounded-2xl border-left-accent bg-accent/5">
            <div className="flex-between mb-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-accent">Em Banho/Tosa</h4>
              <Droplets size={18} className="text-accent" />
            </div>
            <p className="text-h2">2</p>
            <p className="text-[10px] text-muted">Em execução agora</p>
          </div>
          <div className="surface p-6 rounded-2xl border-left-success bg-success/5">
            <div className="flex-between mb-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-success">Prontos / Finalizados</h4>
              <CheckCircle2 size={18} className="text-success" />
            </div>
            <p className="text-h2">8</p>
            <p className="text-[10px] text-muted">Aguardando retirada</p>
          </div>
        </div>

        {/* Lista de Atendimentos */}
        <div className="col-span-12 surface overflow-hidden">
          <div className="p-6 border-bottom flex-between">
            <h3 className="text-h3">Atendimentos de Hoje</h3>
            <div className="flex gap-2">
               <div className="input-wrapper input-sm">
                  <Search size={14} className="input-icon" />
                  <input type="text" placeholder="Buscar..." className="input-field with-icon" />
               </div>
            </div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Paciente</th>
                  <th>Serviço</th>
                  <th>Tutor</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map(a => (
                  <tr key={a.id} className="hover:bg-bg-muted/30 transition-colors">
                    <td className="font-bold">{a.time}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/5 text-accent flex-center">
                          <PawPrint size={14} />
                        </div>
                        <span className="font-bold text-sm">{a.animal}</span>
                      </div>
                    </td>
                    <td className="text-sm font-medium">{a.service}</td>
                    <td className="text-xs text-muted">{a.tutor}</td>
                    <td className="font-bold text-sm">{a.price}</td>
                    <td>
                      <span className={`badge ${a.status === 'IN_PROGRESS' ? 'badge-accent animate-pulse' : (a.status === 'WAITING' ? 'badge-warning' : 'badge-secondary')}`}>
                        {a.status === 'IN_PROGRESS' ? 'Em Banho' : (a.status === 'WAITING' ? 'Aguardando' : 'Agendado')}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-secondary btn-sm">Finalizar</button>
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

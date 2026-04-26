"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Hospital, 
  Plus, 
  Search, 
  Bed, 
  Activity, 
  Clock, 
  AlertTriangle,
  User,
  ChevronRight,
  PawPrint
} from "lucide-react";

export default function InternacaoPage() {
  const [loading, setLoading] = useState(true);

  const internacoes = [
    { id: 1, animal: "Thor", breed: "Bulldog Francês", reason: "Pós-operatório", bed: "Baia 01", entry: "22/04/2026 - 14:30", status: "CRITICAL", professional: "Dra. Luana" },
    { id: 2, animal: "Mel", breed: "Siamês", reason: "Observação / Desidratação", bed: "Gatil 03", entry: "23/04/2026 - 09:00", status: "STABLE", professional: "Dr. Marcos" },
  ];

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-8">Carregando Internações...</div>;

  return (
    <div className="animate-fade-in p-4">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Hospital size={32} className="text-accent" />
            Mapa de Internação
          </h1>
          <p className="text-muted">Acompanhamento em tempo real dos pacientes internos.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} />
          Nova Internação
        </button>
      </div>

      <div className="grid-12 gap-6">
        {/* Stats */}
        <div className="col-span-12 grid-4 mb-2">
          <div className="card-flat border-left-accent">
            <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-1">Ocupação</p>
            <div className="flex-between">
              <p className="text-h2">2/10</p>
              <span className="text-xs text-success font-bold">20%</span>
            </div>
            <div className="w-full h-1 bg-bg-muted rounded-full mt-2">
              <div className="bg-accent h-full" style={{ width: '20%' }}></div>
            </div>
          </div>
          <div className="card-flat border-left-danger bg-danger/5">
            <p className="text-[10px] uppercase font-bold text-danger tracking-widest mb-1">Críticos</p>
            <p className="text-h2 text-danger">1</p>
          </div>
          <div className="card-flat border-left-success bg-success/5">
            <p className="text-[10px] uppercase font-bold text-success tracking-widest mb-1">Estáveis</p>
            <p className="text-h2 text-success">1</p>
          </div>
          <div className="card-flat border-left-warning bg-warning/5">
            <p className="text-[10px] uppercase font-bold text-warning tracking-widest mb-1">Previsão de Alta</p>
            <p className="text-h2 text-warning">0</p>
          </div>
        </div>

        {/* Mapa de Baias / Leitos */}
        <div className="col-span-12 grid-2">
          {internacoes.map(item => (
            <div key={item.id} className="surface p-0 rounded-2xl border border-transparent hover:border-accent/30 transition-all flex flex-col overflow-hidden">
              <div className="p-6 flex gap-6">
                <div className={`w-20 h-20 rounded-2xl flex-center flex-col gap-1 text-white ${item.status === 'CRITICAL' ? 'bg-danger' : 'bg-success'}`}>
                  <Bed size={24} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">{item.bed}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex-between mb-2">
                    <h3 className="text-h3">{item.animal}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'CRITICAL' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {item.status === 'CRITICAL' ? 'ESTADO CRÍTICO' : 'ESTADO ESTÁVEL'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted mb-4">{item.breed} • {item.reason}</p>
                  
                  <div className="grid-2 gap-4 pt-4 border-top">
                    <div className="flex items-center gap-2 text-[11px] text-muted">
                      <Clock size={14} /> Entrada: {item.entry}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted">
                      <User size={14} /> Resp: {item.professional}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Monitoramento Rápido (SOAP Internação) */}
              <div className="bg-bg-muted/30 p-4 border-t">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Últimas Monitorações (Hoje)</p>
                <div className="table-container p-0 border-0 bg-transparent">
                  <table className="table table-sm text-[11px]">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>FC</th>
                        <th>FR</th>
                        <th>Temp</th>
                        <th>Nível</th>
                        <th>Fluidot.</th>
                        <th>Obs</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>08:00</td>
                        <td>90</td>
                        <td>24</td>
                        <td>38.5</td>
                        <td>ALERTA</td>
                        <td>RL 4ml/h</td>
                        <td>Estável</td>
                      </tr>
                      <tr>
                        <td>09:00</td>
                        <td className="text-danger font-bold">110</td>
                        <td>28</td>
                        <td>38.7</td>
                        <td>AGITADO</td>
                        <td>RL 4ml/h</td>
                        <td>Febre</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-6">
                  <button className="btn btn-secondary btn-sm flex-1 gap-2" onClick={() => window.scrollTo({ top: 500, behavior: 'smooth' })}><Activity size={14} /> Monitorar</button>
                  <Link href={`/admin/animais/ficha/101`} className="btn btn-secondary btn-sm flex-1 gap-2">Ver Ficha</Link>
                </div>
              </div>
            </div>
          ))}

          {/* Baia Vazia */}
          <div className="surface p-6 rounded-2xl border border-dashed border-border opacity-50 flex-center flex-col gap-3">
            <div className="w-12 h-12 rounded-full bg-bg-muted flex-center">
              <Plus size={24} className="text-muted" />
            </div>
            <p className="text-sm font-bold text-muted">Baia Disponível</p>
            <button className="btn btn-secondary btn-sm">Internar Novo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

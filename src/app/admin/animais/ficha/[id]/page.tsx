"use client";

import { useState, useEffect } from "react";
import { 
  PawPrint, 
  User, 
  Calendar, 
  Weight, 
  Heart, 
  AlertTriangle,
  History,
  FileText,
  Syringe,
  Microscope,
  Hospital,
  Plus,
  ChevronRight,
  Clock,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function FichaAnimalPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("prontuario");

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-8">Carregando ficha clínica...</div>;

  const animal = {
    name: "Rex",
    species: "Cão",
    breed: "Golden Retriever",
    sex: "Macho",
    age: "3 anos",
    weight: "32kg",
    tutor: "João Silva",
    tutorPhone: "(11) 98888-7777",
    status: "ACTIVE",
    allergies: "Alergia a Dipirona",
    conditions: "Dermatite atópica",
    microchip: "981000001234567",
    reproductive: "Castrado"
  };

  const timeline = [
    { date: "20/04/2026", type: "CONSULTA", title: "Consulta de Retorno", professional: "Dra. Luana Sampaio", content: "Animal apresenta melhora na dermatite. Mantida medicação." },
    { date: "15/04/2026", type: "VACINA", title: "V10 + Raiva", professional: "Dra. Luana Sampaio", content: "Aplicação de reforço anual. Próxima dose em 15/04/2027." },
    { date: "12/04/2026", type: "EXAME", title: "Hemograma Completo", professional: "Laboratório Vet", content: "Resultados dentro da normalidade para a idade." },
    { date: "10/04/2026", type: "CONSULTA", title: "Consulta Inicial - Dermatite", professional: "Dra. Luana Sampaio", content: "Presença de prurido intenso e vermelhidão em patas." }
  ];

  return (
    <div className="animate-fade-in p-4 max-w-[1200px] mx-auto">
      {/* Header / Nav */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/animais" className="btn-icon">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-h1 flex items-center gap-2">
            Ficha Clínica: {animal.name}
          </h1>
          <p className="text-muted text-sm">Registro Centralizado • ID: #{id}</p>
        </div>
      </div>

      <div className="grid-12">
        
        {/* LEFT: INFO CARD */}
        <div className="col-span-4 space-y-6">
          <div className="surface p-6 rounded-2xl border-left-accent">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-accent/10 text-accent flex-center mb-4 border-2 border-accent/20">
                <PawPrint size={48} />
              </div>
              <h2 className="text-h2">{animal.name}</h2>
              <span className="text-sm text-muted">{animal.breed} • {animal.species}</span>
            </div>

            <div className="space-y-4">
              <div className="flex-between text-sm">
                <span className="text-muted flex items-center gap-2"><Calendar size={14} /> Idade</span>
                <span className="font-medium">{animal.age}</span>
              </div>
              <div className="flex-between text-sm">
                <span className="text-muted flex items-center gap-2"><Weight size={14} /> Peso</span>
                <span className="font-medium">{animal.weight}</span>
              </div>
              <div className="flex-between text-sm">
                <span className="text-muted flex items-center gap-2"><Heart size={14} /> Sexo</span>
                <span className="font-medium">{animal.sex} ({animal.reproductive})</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-top">
              <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-4">Tutor Responsável</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-bg-muted flex-center font-bold">{animal.tutor.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold">{animal.tutor}</p>
                  <p className="text-xs text-muted">{animal.tutorPhone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="surface p-6 rounded-2xl border-left-danger bg-danger/5">
            <div className="flex items-center gap-3 mb-4 text-danger">
              <AlertTriangle size={18} />
              <h3 className="font-bold">Alertas Clínicos</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-danger font-medium">• {animal.allergies}</p>
              <p className="text-sm text-danger font-medium">• {animal.conditions}</p>
            </div>
          </div>
        </div>

        {/* RIGHT: TABS & TIMELINE */}
        <div className="col-span-8 space-y-6">
          
          {/* Custom Tabs */}
          <div className="surface p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setActiveTab("prontuario")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex-center gap-2 ${activeTab === 'prontuario' ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
            >
              <FileText size={16} /> Prontuário
            </button>
            <button 
              onClick={() => setActiveTab("vacinas")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex-center gap-2 ${activeTab === 'vacinas' ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
            >
              <Syringe size={16} /> Vacinas
            </button>
            <button 
              onClick={() => setActiveTab("exames")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex-center gap-2 ${activeTab === 'exames' ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
            >
              <Microscope size={16} /> Exames
            </button>
            <button 
              onClick={() => setActiveTab("internacao")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex-center gap-2 ${activeTab === 'internacao' ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
            >
              <Hospital size={16} /> Internação
            </button>
          </div>

          {activeTab === 'prontuario' && (
            <div className="space-y-6 animate-in">
              <div className="flex-between">
                <h3 className="text-h3 flex items-center gap-2">
                  <History size={20} className="text-accent" />
                  Prontuário Eletrônico (SOAP)
                </h3>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm gap-2" onClick={() => window.print()}>
                    <FileText size={16} /> Imprimir Ficha
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })}>
                    <Plus size={16} /> Novo Atendimento
                  </button>
                </div>
              </div>

              {/* Editor de Atendimento (Simulado) */}
              <div className="surface p-6 border border-accent/20 bg-accent/5 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-8 bg-accent rounded-full"></div>
                  <h4 className="font-bold text-lg text-accent">Novo Registro Clínico</h4>
                </div>

                <div className="grid-2 gap-6 mb-6">
                  <div className="input-group">
                    <label className="input-label">Motivo / Queixa Principal</label>
                    <input type="text" className="input-field" placeholder="Ex: Prurido, Vômito, Check-up" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Profissional Responsável</label>
                    <input type="text" className="input-field" defaultValue="Dra. Luana Sampaio" readOnly />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid-2 gap-6">
                    <div className="input-group">
                      <label className="input-label flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent text-white text-[10px] flex-center rounded-full">S</span> 
                        Subjetivo (Anamnese)
                      </label>
                      <textarea className="input-field h-32" placeholder="Histórico relatado pelo tutor, comportamento, apetite..."></textarea>
                    </div>
                    <div className="input-group">
                      <label className="input-label flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent text-white text-[10px] flex-center rounded-full">O</span> 
                        Objetivo (Exame Físico)
                      </label>
                      <div className="grid-2 gap-4 mb-4">
                        <div className="input-wrapper">
                          <span className="text-[10px] font-bold text-muted mr-2">FC (bpm)</span>
                          <input type="text" className="input-field py-1" placeholder="---" />
                        </div>
                        <div className="input-wrapper">
                          <span className="text-[10px] font-bold text-muted mr-2">FR (mpm)</span>
                          <input type="text" className="input-field py-1" placeholder="---" />
                        </div>
                        <div className="input-wrapper">
                          <span className="text-[10px] font-bold text-muted mr-2">T (ºC)</span>
                          <input type="text" className="input-field py-1" placeholder="---" />
                        </div>
                        <div className="input-wrapper">
                          <span className="text-[10px] font-bold text-muted mr-2">TRC (s)</span>
                          <input type="text" className="input-field py-1" placeholder="---" />
                        </div>
                      </div>
                      <textarea className="input-field h-16" placeholder="Mucosas, linfonodos, palpação abdominal..."></textarea>
                    </div>
                  </div>

                  <div className="grid-2 gap-6">
                    <div className="input-group">
                      <label className="input-label flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent text-white text-[10px] flex-center rounded-full">A</span> 
                        Avaliação (Diagnóstico)
                      </label>
                      <textarea className="input-field h-24" placeholder="Hipóteses diagnósticas e conclusões..."></textarea>
                    </div>
                    <div className="input-group">
                      <label className="input-label flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent text-white text-[10px] flex-center rounded-full">P</span> 
                        Plano (Tratamento)
                      </label>
                      <textarea className="input-field h-24" placeholder="Conduta terapêutica, exames solicitados, retorno..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-top flex-between">
                  <div className="flex gap-3">
                    <Link href="/admin/prescricao" className="btn btn-secondary gap-2"><Syringe size={16} /> Prescrever</Link>
                    <button className="btn btn-secondary gap-2" onClick={() => alert('Abrindo painel de exames...')}>
                      <Microscope size={16} /> Solicitar Exames
                    </button>
                  </div>
                  <button className="btn btn-primary px-8" onClick={() => alert('Prontuário salvo com sucesso!')}>Salvar Prontuário</button>
                </div>
              </div>

              <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-border">
                {timeline.map((entry, idx) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[26px] top-0 w-4 h-4 rounded-full border-2 border-white ${entry.type === 'CONSULTA' ? 'bg-accent' : (entry.type === 'VACINA' ? 'bg-success' : 'bg-info')}`}></div>
                    <div className="surface p-5 rounded-2xl shadow-sm border border-transparent hover:border-accent/20 transition-all">
                      <div className="flex-between mb-2">
                        <span className="text-[10px] font-black text-muted uppercase tracking-tighter">{entry.type} • {entry.date}</span>
                        <span className="text-xs font-medium text-muted flex items-center gap-1"><Clock size={12} /> {entry.professional}</span>
                      </div>
                      <h4 className="font-bold text-lg mb-2">{entry.title}</h4>
                      <p className="text-sm text-muted leading-relaxed">{entry.content}</p>
                      <button className="text-accent text-xs font-bold mt-4 flex items-center gap-1 hover:underline">
                        Ver detalhes completos <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab !== 'prontuario' && (
            <div className="surface p-12 rounded-2xl text-center animate-in">
              <div className="w-16 h-16 bg-bg-muted rounded-full flex-center mx-auto mb-4 opacity-50">
                <FileText size={32} />
              </div>
              <h3 className="text-h3 text-muted">Histórico de {activeTab}</h3>
              <p className="text-sm text-muted">Ainda não há registros nesta categoria.</p>
              <button className="btn btn-secondary mt-6">Adicionar Registro</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

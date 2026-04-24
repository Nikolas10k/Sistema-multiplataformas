"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  FileText, 
  Activity, 
  History, 
  Plus, 
  Save, 
  Clock, 
  ChevronLeft,
  Calendar,
  Stethoscope,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ClinicalFilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("anamnese");
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    // Mock patient data
    setPatient({
      id,
      name: "João Silva",
      age: 42,
      birthDate: "1984-05-12",
      phone: "(11) 98888-7777",
      diagnosis: "Hérnia de disco L4-L5",
      status: "Em tratamento"
    });
    setLoading(false);
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted">Carregando prontuário...</div>;

  return (
    <div className="animate-fade-in">
      {/* Header com Navegação */}
      <div className="flex-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/pacientes" className="btn-circle bg-bg-surface border">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-h2">{patient.name}</h1>
            <p className="text-sm text-muted">
              {patient.age} anos • <span className="font-medium text-accent">{patient.diagnosis}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-primary">ID: {patient.id}</span>
          <span className="badge badge-success">{patient.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar do Prontuário */}
        <div className="col-span-12 lg:col-span-3">
          <div className="surface p-2 sticky top-24">
            <button 
              onClick={() => setActiveTab("anamnese")}
              className={`w-full flex items-center gap-3 p-3 rounded-md transition-all ${activeTab === 'anamnese' ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
            >
              <ClipboardList size={18} />
              <span className="font-medium">Anamnese</span>
            </button>
            <button 
              onClick={() => setActiveTab("evolucao")}
              className={`w-full flex items-center gap-3 p-3 rounded-md transition-all mt-1 ${activeTab === 'evolucao' ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
            >
              <Activity size={18} />
              <span className="font-medium">Evolução Clínica</span>
            </button>
            <button 
              onClick={() => setActiveTab("historico")}
              className={`w-full flex items-center gap-3 p-3 rounded-md transition-all mt-1 ${activeTab === 'historico' ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
            >
              <History size={18} />
              <span className="font-medium">Histórico</span>
            </button>
            <div className="divider my-4"></div>
            <div className="p-3">
              <p className="text-xs text-label mb-2">Informações de Contato</p>
              <p className="text-sm">{patient.phone}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="col-span-12 lg:col-span-9">
          {activeTab === 'anamnese' && (
            <div className="card animate-fade-in">
              <div className="flex-between mb-6">
                <h3 className="text-h3 flex items-center gap-2">
                  <ClipboardList size={20} className="text-accent" />
                  Ficha de Anamnese
                </h3>
                <button className="btn btn-secondary btn-sm">
                  <Save size={16} />
                  Salvar Alterações
                </button>
              </div>
              
              <div className="flex flex-col gap-6">
                <div className="input-group">
                  <label className="input-label">Queixa Principal</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    placeholder="Descreva a queixa principal do paciente..."
                    defaultValue="Dor aguda na região lombar irradiando para a perna esquerda há 3 semanas."
                  ></textarea>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Histórico de Doenças</label>
                    <textarea className="input-field" rows={4}></textarea>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Medicamentos em Uso</label>
                    <textarea className="input-field" rows={4}></textarea>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Objetivos do Tratamento</label>
                  <textarea className="input-field" rows={3} defaultValue="Redução do quadro álgico, melhora da amplitude de movimento e fortalecimento de core."></textarea>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evolucao' && (
            <div className="flex flex-col gap-6">
              <div className="card">
                <div className="flex-between mb-4">
                  <h3 className="text-h3">Nova Evolução</h3>
                  <span className="text-sm text-muted flex items-center gap-1">
                    <Calendar size={14} /> {new Date().toLocaleDateString()}
                  </span>
                </div>
                <textarea 
                  className="input-field mb-4" 
                  rows={4} 
                  placeholder="Relate o atendimento de hoje, progresso e condutas..."
                ></textarea>
                <div className="flex-between">
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm">Melhora</button>
                    <button className="btn btn-ghost btn-sm">Estável</button>
                  </div>
                  <button className="btn btn-primary">
                    <Plus size={16} />
                    Registrar Atendimento
                  </button>
                </div>
              </div>

              {/* Timeline de Evoluções */}
              <div className="flex flex-col gap-4">
                <h4 className="text-label">Evoluções Anteriores</h4>
                
                {[1, 2].map((i) => (
                  <div key={i} className="card-flat relative pl-8 border-l-2 border-accent-light">
                    <div className="absolute left-[-9px] top-6 w-4 height-4 rounded-full bg-accent border-4 border-bg-page"></div>
                    <div className="flex-between mb-2">
                      <span className="text-sm font-semibold">2{i}/04/2026</span>
                      <span className="badge badge-neutral text-xs">Sessão #{3-i}</span>
                    </div>
                    <p className="text-sm text-secondary">
                      Paciente relata melhora significativa na dor irradiada. Realizado exercícios de mobilidade neural e liberação miofascial em paravertebrais.
                    </p>
                    <p className="text-xs text-muted mt-2">Registrado por: Dr. Ricardo (Fisioterapeuta)</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="card animate-fade-in">
              <h3 className="text-h3 mb-6">Histórico de Atendimentos e Documentos</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Profissional</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>20/04/2026</td>
                      <td>Sessão de Fisioterapia</td>
                      <td>Dr. Ricardo</td>
                      <td><span className="badge badge-success">Concluído</span></td>
                    </tr>
                    <tr>
                      <td>18/04/2026</td>
                      <td>Avaliação Inicial</td>
                      <td>Dra. Ana</td>
                      <td><span className="badge badge-success">Concluído</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

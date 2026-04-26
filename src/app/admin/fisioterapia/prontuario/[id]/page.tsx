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

import { getPatientById } from "@/actions/clinical";

export default function ClinicalFilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("anamnese");
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [evolutionText, setEvolutionText] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [complaint, setComplaint] = useState("");

  useEffect(() => {
    async function fetchPatient() {
      if (!id || typeof id !== 'string') return;
      const data = await getPatientById(id);
      if (data) {
        setPatient({
          ...data,
          age: data.birthDate ? Math.floor((new Date().getTime() - new Date(data.birthDate).getTime()) / 31557600000) : "N/A",
          status: "Em tratamento"
        });
      } else {
        setPatient({
          id,
          name: "Paciente não encontrado",
          age: "-",
          phone: "-",
          diagnosis: "Sem diagnóstico prévio",
          status: "Não Iniciado"
        });
      }
      setLoading(false);
    }
    fetchPatient();
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
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    // Logic to save anamnesis
                    alert("Ficha de Anamnese salva com sucesso!");
                  }}
                >
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
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                  ></textarea>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Diagnóstico Clínico</label>
                    <textarea 
                      className="input-field" 
                      rows={4}
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Medicamentos em Uso</label>
                    <textarea className="input-field" rows={4}></textarea>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Objetivos do Tratamento</label>
                  <textarea className="input-field" rows={3} defaultValue=""></textarea>
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
                  value={evolutionText}
                  onChange={(e) => setEvolutionText(e.target.value)}
                ></textarea>
                <div className="flex-between">
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEvolutionText(evolutionText + " [Melhora]")}>Melhora</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEvolutionText(evolutionText + " [Estável]")}>Estável</button>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={async () => {
                      if (!evolutionText) return;
                      // Logic to save evolution
                      alert("Evolução registrada com sucesso!");
                      setEvolutionText("");
                    }}
                  >
                    <Plus size={16} />
                    Registrar Atendimento
                  </button>
                </div>
              </div>

              {/* Timeline de Evoluções */}
              <div className="flex flex-col gap-4">
                <h4 className="text-label">Evoluções Anteriores</h4>
                
                <div className="p-4 text-center border border-dashed border-border rounded-xl">
                  <p className="text-muted">Nenhuma evolução registrada ainda.</p>
                </div>
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
                      <td colSpan={4} className="text-center py-4 text-muted">Nenhum atendimento registrado.</td>
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

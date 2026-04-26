"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  Download,
  Stethoscope,
  Clock,
  ChevronRight,
  PawPrint,
  CheckCircle2,
  Settings
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";

export default function PrescricaoPage() {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  
  // Estados do Formulário
  const [currentMed, setCurrentMed] = useState({
    name: "",
    dosage: "100mg",
    frequency: "12/12h",
    duration: "28 dias",
    route: "Oral",
    quantity: "56 comprimidos",
    instructions: ""
  });

  const modelos = {
    hemoparasitose: [
      { id: 1, name: "Doxiciclina (Hiclato)", dosage: "100mg", frequency: "12/12h", duration: "28 dias", route: "Oral", quantity: "56 comprimidos", instructions: "Administrar estritamente após alimentação para evitar esofagite/gastrite." },
      { id: 2, name: "Prednisolona", dosage: "20mg", frequency: "24/24h", duration: "7 dias", route: "Oral", quantity: "7 comprimidos", instructions: "Uso em caso de trombocitopenia severa. Não interromper bruscamente." },
      { id: 3, name: "Dipirona Monoidratada", dosage: "500mg/ml", frequency: "8/8h", duration: "5 dias", route: "Oral", quantity: "1 frasco", instructions: "Dar se houver febre ou dor evidente." }
    ],
    otite: [
      { id: 4, name: "Solução Otológica Combinada", dosage: "5 gotas", frequency: "12/12h", duration: "10 dias", route: "Otológica", quantity: "1 frasco", instructions: "Realizar limpeza prévia do conduto com ceruminolítico." },
      { id: 5, name: "Cefalexina", dosage: "250mg", frequency: "12/12h", duration: "14 dias", route: "Oral", quantity: "28 comprimidos", instructions: "Antibioticoterapia sistêmica para casos de otite média/severa." }
    ],
    pos_cirurgico: [
      { id: 6, name: "Meloxicam", dosage: "1mg", frequency: "24/24h", duration: "4 dias", route: "Oral", quantity: "4 comprimidos", instructions: "Anti-inflamatório pós-operatório. Dar após refeição." },
      { id: 7, name: "Dipirona", dosage: "500mg", frequency: "8/8h", duration: "3 dias", route: "Oral", quantity: "9 comprimidos", instructions: "Analgesia de suporte para dor aguda." }
    ]
  };

  useEffect(() => {
    getMyTenantContext().then(ctx => {
      setTenantInfo(ctx);
      setLoading(false);
    });
  }, []);

  const loadModel = (key: string) => {
    if (key === 'hemoparasitose') setMedicines([...modelos.hemoparasitose]);
    if (key === 'otite') setMedicines([...modelos.otite]);
    if (key === 'pos_cirurgico') setMedicines([...modelos.pos_cirurgico]);
    alert(`Protocolo ${key.replace('_', ' ')} carregado com sucesso!`);
  };

  const startEdit = (item: any) => {
    setCurrentMed({ ...item });
    setEditingId(item.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCurrentMed({ name: "", dosage: "100mg", frequency: "12/12h", duration: "28 dias", route: "Oral", quantity: "", instructions: "" });
  };

  const addOrUpdateMedicine = () => {
    if (!currentMed.name) {
      alert("Selecione um medicamento.");
      return;
    }

    if (editingId) {
      setMedicines(medicines.map(m => m.id === editingId ? { ...currentMed, id: editingId } : m));
      setEditingId(null);
    } else {
      const newItem = {
        id: Date.now(),
        ...currentMed
      };
      setMedicines([...medicines, newItem]);
    }

    setCurrentMed({ name: "", dosage: "100mg", frequency: "12/12h", duration: "28 dias", route: "Oral", quantity: "", instructions: "" });
  };

  const removeMedicine = (id: number) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const handlePrint = () => {
    if (medicines.length === 0) {
      alert("Adicione pelo menos um medicamento.");
      return;
    }
    window.print();
  };

  if (loading) return <div className="p-8">Carregando Módulo de Prescrição...</div>;

  return (
    <div className="animate-fade-in p-4 max-w-[1200px] mx-auto print-container">
      <div className="flex-between mb-8 no-print">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <FileText size={32} className="text-accent" />
            Emissor de Receituário
          </h1>
          <p className="text-muted">Gere receitas veterinárias profissionais com protocolos pré-prontos.</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="input-field py-2 text-sm bg-accent/5 border-accent/20 text-accent font-bold"
            onChange={(e) => loadModel(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Selecione um Modelo...</option>
            <option value="hemoparasitose">Protocolo Hemoparasitose</option>
            <option value="otite">Protocolo Otite (Breve)</option>
            <option value="pos_cirurgico">Pós-Cirúrgico Geral (Breve)</option>
          </select>
          <button className="btn btn-primary gap-2" onClick={handlePrint}>
            <Printer size={18} /> Imprimir Receita
          </button>
        </div>
      </div>

      <div className="grid-12 gap-8">
        
        {/* LEFT: FORM (Escondido na impressão) */}
        <div className="col-span-5 space-y-6 no-print">
          <div className="surface p-6 border border-accent/20">
            <h3 className="text-h3 mb-6 flex items-center gap-2">
              <Plus size={20} className="text-accent" />
              Adicionar Medicamento
            </h3>
            
            <div className="space-y-4">
              <div className="input-group">
                <label className="input-label">Medicamento</label>
                <select 
                  className="input-field" 
                  value={currentMed.name}
                  onChange={e => setCurrentMed({...currentMed, name: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  <option value="Doxiciclina">Doxiciclina</option>
                  <option value="Dipirona">Dipirona</option>
                  <option value="Prednisolona">Prednisolona</option>
                  <option value="Cefalexina">Cefalexina</option>
                  <option value="Meloxicam">Meloxicam</option>
                  <option value="Amoxicilina">Amoxicilina</option>
                </select>
              </div>

              <div className="grid-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Concentração (mg)</label>
                  <select 
                    className="input-field" 
                    value={currentMed.dosage}
                    onChange={e => setCurrentMed({...currentMed, dosage: e.target.value})}
                  >
                    <option value="50mg">50mg</option>
                    <option value="80mg">80mg</option>
                    <option value="100mg">100mg</option>
                    <option value="200mg">200mg</option>
                    <option value="500mg">500mg</option>
                    <option value="500mg/ml">500mg/ml (Gotas)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Quantidade (Unidades)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ex: 14 comprimidos" 
                    value={currentMed.quantity}
                    onChange={e => setCurrentMed({...currentMed, quantity: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Posologia (Frequência)</label>
                  <select 
                    className="input-field" 
                    value={currentMed.frequency}
                    onChange={e => setCurrentMed({...currentMed, frequency: e.target.value})}
                  >
                    <option value="12/12h">12 em 12 horas</option>
                    <option value="8/8h">8 em 8 horas</option>
                    <option value="24/24h">Uma vez ao dia</option>
                    <option value="6/6h">6 em 6 horas</option>
                    <option value="Dose Única">Dose Única</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Duração</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ex: 10 dias" 
                    value={currentMed.duration}
                    onChange={e => setCurrentMed({...currentMed, duration: e.target.value})}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Via</label>
                <select 
                  className="input-field"
                  value={currentMed.route}
                  onChange={e => setCurrentMed({...currentMed, route: e.target.value})}
                >
                  <option>Oral</option>
                  <option>Tópica</option>
                  <option>Ocular</option>
                  <option>Otológica</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Orientações</label>
                <textarea 
                  className="input-field h-20" 
                  placeholder="Instruções de administração..."
                  value={currentMed.instructions}
                  onChange={e => setCurrentMed({...currentMed, instructions: e.target.value})}
                ></textarea>
              </div>

              <button className={`btn w-full py-4 mt-4 ${editingId ? 'btn-secondary border-accent text-accent' : 'btn-primary'}`} onClick={addOrUpdateMedicine}>
                {editingId ? "Salvar Alteração" : "Incluir na Receita"}
              </button>
              
              {editingId && (
                <button className="btn btn-ghost w-full py-2 text-muted text-xs underline" onClick={cancelEdit}>
                  Cancelar Edição
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="col-span-7 print-only-width">
          <div className="surface p-8 rounded-2xl bg-white text-slate-800 shadow-xl min-h-[700px] flex flex-col border border-border prescription-paper">
            {/* Header Receita */}
            <div className="text-center border-bottom pb-6 mb-8">
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">
                {tenantInfo?.tenantName || "Sua Clínica"}
              </h2>
              <p className="text-xs text-muted font-bold tracking-tighter">CRM-V 12345 • Dra. Luana Sampaio</p>
            </div>

            {/* Info Paciente */}
            <div className="mb-10 flex-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Paciente</p>
                <h4 className="text-lg font-bold text-slate-900">Rex</h4>
                <p className="text-sm text-muted">Espécie: Canino • Raça: Golden Retriever</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Data</p>
                <p className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Lista de Meds */}
            <div className="flex-1 space-y-10">
              <p className="text-sm font-black italic border-b-2 border-slate-900 pb-1 mb-6 text-slate-900 inline-block">Uso Interno:</p>
              
              {medicines.map((m, idx) => (
                <div key={idx} className="relative group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-slate-900 text-lg">{idx + 1}.</span>
                        <p className="font-black text-slate-900 text-lg uppercase">{m.name} {m.dosage}</p>
                        <span className="text-slate-400">........................</span>
                        <span className="font-bold text-slate-900">{m.quantity}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-2 ml-6">
                        Administrar por via {m.route}, {m.frequency} durante {m.duration}.
                      </p>
                      {m.instructions && (
                        <p className="text-xs text-slate-500 italic mt-2 ml-6 font-medium">Obs: {m.instructions}</p>
                      )}
                    </div>
                    <div className="flex gap-2 no-print ml-4">
                      <button 
                        className="text-accent opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => startEdit(m)}
                        title="Editar"
                      >
                        <Settings size={16} />
                      </button>
                      <button 
                        className="text-danger opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => removeMedicine(m.id)}
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {medicines.length === 0 && (
                <div className="py-20 text-center opacity-30 no-print">
                  <FileText size={48} className="mx-auto mb-4" />
                  <p className="text-xs font-bold uppercase">Receita Vazia</p>
                </div>
              )}
            </div>

            {/* Footer Receita */}
            <div className="mt-12 text-center pt-8 border-t border-dashed border-slate-300">
              <div className="w-40 h-px bg-slate-900 mx-auto mb-2"></div>
              <p className="text-[10px] font-bold text-slate-900">Assinatura do Veterinário</p>
              <p className="text-[9px] text-slate-400 mt-6 max-w-md mx-auto">
                {tenantInfo?.tenantAddress || "Endereço não configurado"} <br />
                {tenantInfo?.tenantPhone || "Telefone não configurado"} • {tenantInfo?.tenantEmail || "E-mail não configurado"}
              </p>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .prescription-paper {
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            background: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }

          /* ESCONDER TUDO QUE NÃO É A RECEITA */
          .no-print, aside, nav, .sidebar, .topbar, .header-admin, .mobile-menu {
            display: none !important;
          }

          .admin-layout, .main-content, .login-4k-viewport, .login-ultimate-container, 
          #__next, body > div:not(.print-container) {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            width: 100% !important;
            display: block !important;
          }

          .print-only-width {
            width: 100% !important;
            max-width: 100% !important;
            grid-column: span 12 / span 12 !important;
            position: absolute;
            top: 0;
            left: 0;
          }

          .prescription-paper {
            width: 190mm;
            min-height: 270mm;
            margin: 0 auto;
            border: none !important;
            box-shadow: none !important;
            padding: 15mm !important;
            display: flex;
            flex-direction: column;
            background: white !important;
            color: black !important;
          }

          .prescription-paper h2 { color: black !important; }
          .prescription-paper p { color: #333 !important; }
          
          /* Ajustes de escala para garantir que caiba */
          html, body {
            width: 210mm;
            height: 297mm;
          }
        }
      `}</style>
    </div>
  );
}

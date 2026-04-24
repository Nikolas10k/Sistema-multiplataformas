"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ClipboardCheck, 
  DollarSign, 
  ChevronRight,
  PieChart,
  Activity,
  Download,
  Calendar,
  FileText,
  Plus
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";

export default function ReportsPage() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTenantContext().then(ctx => {
      setContext(ctx);
      setLoading(false);
    });
  }, []);

  const niche = context?.niche || 'GENERAL';

  const physioReports = [
    {
      title: "Faturamento por Período",
      desc: "Análise completa de receitas, convênios e pagamentos particulares.",
      icon: <DollarSign className="text-success" />,
      category: "Financeiro"
    },
    {
      title: "Volume de Atendimentos",
      desc: "Relatório de sessões realizadas, faltas e reagendamentos.",
      icon: <Calendar className="text-accent" />,
      category: "Operacional"
    },
    {
      title: "Novos Pacientes vs Altas",
      desc: "Acompanhamento do crescimento da base de pacientes.",
      icon: <TrendingUp className="text-blue-500" />,
      category: "Crescimento"
    },
    {
      title: "Evoluções Pendentes",
      desc: "Lista de sessões concluídas que ainda não possuem evolução clínica assinada.",
      icon: <FileText className="text-warning" />,
      category: "Clínico"
    },
    {
      title: "Performance por Procedimento",
      desc: "Quais tratamentos e pacotes são mais rentáveis para a clínica.",
      icon: <PieChart className="text-purple-500" />,
      category: "Gestão"
    },
    {
      title: "Anamnese e Fichas Incompletas",
      desc: "Auditoria de dados obrigatórios nos prontuários dos pacientes.",
      icon: <ClipboardCheck className="text-danger" />,
      category: "Qualidade"
    }
  ];

  const genericReports = [
    {
      title: "Resumo de Vendas",
      desc: "Visão geral de faturamento e vendas de produtos/serviços.",
      icon: <BarChart3 />,
      category: "Geral"
    },
    {
      title: "Fluxo de Caixa",
      desc: "Entradas e saídas detalhadas por categoria.",
      icon: <Activity />,
      category: "Financeiro"
    }
  ];

  const reportsToShow = niche === 'PHYSIOTHERAPY' ? physioReports : genericReports;

  if (loading) return <div className="p-8">Carregando painel de análises...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <BarChart3 size={32} className="text-accent" />
            Central de Relatórios
          </h1>
          <p className="text-muted">Gere documentos e analise a performance do seu negócio.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <Download size={18} />
            Exportar Todos (PDF)
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-3">
        {reportsToShow.map((report, i) => (
          <div key={i} className="surface group hover:border-accent/40 transition-all cursor-pointer">
            <div className="p-6">
              <div className="flex-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-bg-muted flex-center group-hover:bg-accent/10 transition-colors">
                  {report.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{report.category}</span>
              </div>
              
              <h3 className="font-bold text-lg mb-2 group-hover:text-accent transition-colors">{report.title}</h3>
              <p className="text-sm text-muted mb-6 leading-relaxed">
                {report.desc}
              </p>

              <div className="flex-between pt-4 border-top" onClick={() => alert("Gerando relatório: " + report.title + "...")}>
                <span className="text-xs font-bold text-accent opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                  GERAR RELATÓRIO
                </span>
                <div className="btn-circle btn-sm bg-bg-muted group-hover:bg-accent group-hover:text-white transition-all">
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Customization Card */}
        <div className="surface bg-accent/5 border-dashed border-accent/20 flex flex-col justify-center items-center p-8 text-center">
          <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex-center mb-4">
            <Plus size={32} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-accent">Relatório Personalizado</h3>
          <p className="text-sm text-muted mb-6">
            Precisa de uma análise específica para sua clínica? Solicite um desenvolvimento sob medida.
          </p>
          <button className="btn btn-primary btn-sm px-6" onClick={() => alert("Solicitação enviada! Nossa equipe entrará em contato para entender sua necessidade.")}>Solicitar Orçamento</button>
        </div>
      </div>

      <style jsx>{`
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .grid-3 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

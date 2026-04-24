"use client";

import { useState, useEffect } from "react";
import { getMyTenantContext } from "@/actions/features";
import StatWidget from "@/components/dashboard/widgets/StatWidget";
import { getTerm } from "@/lib/dictionary";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Plus, 
  FileText, 
  ShoppingCart,
  Clock,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTenantContext().then(ctx => {
      setContext(ctx);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-muted">Carregando painel personalizado...</div>;

  const niche = context?.niche || 'GENERAL';

  // Configuração de widgets por nicho (em prod viria do banco)
  const getWidgets = () => {
    if (niche === 'PHYSIOTHERAPY') {
      return [
        { title: "Sessões Hoje", value: "12", icon: "evolution", color: "accent", trend: "15%" },
        { title: "Novos Pacientes", value: "4", icon: "patients", color: "success", trend: "10%" },
        { title: "Faturamento Mensal", value: "R$ 14.200", icon: "revenue", color: "info", trend: "22%" },
        { title: "Evoluções Pendentes", value: "3", icon: "evolution", color: "warning" },
      ];
    }
    if (niche === 'RETAIL') {
      return [
        { title: "Vendas Hoje", value: "R$ 3.840", icon: "revenue", color: "success", trend: "12%" },
        { title: "Pedidos Realizados", value: "24", icon: "sales", color: "accent" },
        { title: "Estoque Crítico", value: "5 itens", icon: "inventory", color: "danger" },
        { title: "Ticket Médio", value: "R$ 160,00", icon: "revenue", color: "info" },
      ];
    }
    if (niche === 'RESTAURANT') {
      return [
        { title: "Vendas (Mês)", value: "R$ 8.450", icon: "revenue", color: "success", trend: "8%" },
        { title: "Mesas Ativas", value: "6", icon: "sales", color: "accent" },
        { title: "A Receber (Mensal)", value: "R$ 1.200", icon: "revenue", color: "warning" },
        { title: "Itens Vendidos", value: "142", icon: "inventory", color: "info" },
      ];
    }
    return [
      { title: "Vendas", value: "R$ 0,00", icon: "revenue", color: "accent" },
      { title: "Clientes", value: "0", icon: "patients", color: "success" },
    ];
  };

  const widgets = getWidgets();

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1">Olá, Bem-vindo!</h1>
          <p className="text-muted">Aqui está o resumo do seu negócio de {getTerm("niche_name", niche)}.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary">
            <Clock size={18} />
            Histórico
          </button>
          <Link 
            href={niche === 'PHYSIOTHERAPY' ? "/admin/agenda" : (niche === 'RETAIL' ? "/admin/vendas" : "/pdv")} 
            className="btn btn-primary"
          >
            <Plus size={18} />
            Novo {getTerm("appointment", niche)}
          </Link>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid-4 mb-8">
        {widgets.map((w, i) => (
          <StatWidget key={i} {...w} />
        ))}
      </div>

      <div className="grid-12">
        {/* Atividades Recentes / Agenda */}
        <div className="col-span-8 card">
          <div className="flex-between mb-6">
            <h3 className="text-h3 flex items-center gap-2">
              <Calendar size={20} className="text-accent" />
              {niche === 'PHYSIOTHERAPY' ? 'Próximas Sessões' : 'Últimas Vendas'}
            </h3>
            <Link href="/admin/agenda" className="text-sm text-accent font-medium flex items-center gap-1">
              Ver tudo <ArrowRight size={14} />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-between p-3 hover:bg-bg-muted rounded-lg transition-all border border-transparent hover:border-border">
                <div className="flex items-center gap-4">
                  <div className="bg-bg-muted p-2 rounded-md">
                    <Clock size={18} className="text-muted" />
                  </div>
                  <div>
                    <p className="font-medium">1{i}:00 - {i === 1 ? 'João Silva' : i === 2 ? 'Maria Oliveira' : 'Carlos Pereira'}</p>
                    <p className="text-xs text-muted">{niche === 'PHYSIOTHERAPY' ? 'Fisioterapia Traumato' : 'Mesa 05'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">R$ {i * 45},00</span>
                  <button className="btn-icon">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Atalhos Rápidos Personalizados */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="card bg-accent text-white">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-80">Ações Rápidas</h3>
            <div className="flex flex-col gap-3">
              <Link href="/admin/pacientes" className="flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-all">
                <Users size={18} />
                <span>Gerenciar {getTerm("patients", niche)}</span>
              </Link>
              <Link href="/admin/produtos" className="flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-all">
                <ShoppingCart size={18} />
                <span>{getTerm("product", niche)}s</span>
              </Link>
              {niche === 'PHYSIOTHERAPY' && (
                <Link href="/admin/fisioterapia/prontuario" className="flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-all">
                  <FileText size={18} />
                  <span>Novo Prontuário</span>
                </Link>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Meta Mensal</h3>
            <div className="w-full bg-bg-muted h-2 rounded-full overflow-hidden mb-2">
              <div className="bg-success h-full" style={{ width: '65%' }}></div>
            </div>
            <div className="flex-between text-xs">
              <span className="font-medium text-secondary">65% da meta atingida</span>
              <span className="text-muted">R$ 15k / R$ 23k</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

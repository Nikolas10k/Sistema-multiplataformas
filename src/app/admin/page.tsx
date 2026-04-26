"use client";

import { useState, useEffect } from "react";
import { getMyTenantContext } from "@/actions/features";
import { getDashboardData, updateMonthlyGoal } from "@/actions/dashboard";
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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Goal State
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalValue, setGoalValue] = useState("");

  useEffect(() => {
    async function loadData() {
      const ctx = await getMyTenantContext();
      const data = await getDashboardData('monthly');
      setContext(ctx);
      setDashboardData(data);
      setGoalValue((data.monthlyGoal || 0).toString());
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted">Carregando painel personalizado...</div>;

  const niche = context?.niche || 'GENERAL';

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const handleSaveGoal = async () => {
    const val = parseFloat(goalValue.replace(/\D/g, '')) || 0;
    await updateMonthlyGoal(val);
    setDashboardData({ ...dashboardData, monthlyGoal: val });
    setIsEditingGoal(false);
  };

  const monthlyGoal = dashboardData?.monthlyGoal || 0;
  const currentRevenue = dashboardData?.stats?.revenue || 0;
  const goalProgress = monthlyGoal > 0 ? Math.min(100, Math.round((currentRevenue / monthlyGoal) * 100)) : 0;

  const getWidgets = () => {
    const s = dashboardData?.stats || { revenue: 0, orders: 0, customers: 0, avgTicket: 0 };
    
    if (niche === 'PHYSIOTHERAPY') {
      return [
        { title: "Sessões (Mês)", value: s.orders.toString(), icon: "evolution", color: "accent" },
        { title: "Pacientes", value: s.customers.toString(), icon: "patients", color: "success" },
        { title: "Faturamento Mensal", value: formatMoney(s.revenue), icon: "revenue", color: "info" },
        { title: "Evoluções Pendentes", value: "0", icon: "evolution", color: "warning" },
      ];
    }
    if (niche === 'RETAIL') {
      return [
        { title: "Vendas (Mês)", value: formatMoney(s.revenue), icon: "revenue", color: "success" },
        { title: "Pedidos Realizados", value: s.orders.toString(), icon: "sales", color: "accent" },
        { title: "Estoque Crítico", value: "0 itens", icon: "inventory", color: "danger" },
        { title: "Ticket Médio", value: formatMoney(s.avgTicket), icon: "revenue", color: "info" },
      ];
    }
    if (niche === 'RESTAURANT') {
      return [
        { title: "Vendas (Mês)", value: formatMoney(s.revenue), icon: "revenue", color: "success" },
        { title: "Pedidos Realizados", value: s.orders.toString(), icon: "sales", color: "accent" },
        { title: "Ticket Médio", value: formatMoney(s.avgTicket), icon: "revenue", color: "warning" },
        { title: "Itens Vendidos", value: "0", icon: "inventory", color: "info" },
      ];
    }
    if (niche === 'VETERINARY') {
      return [
        { title: "Consultas (Mês)", value: s.orders.toString(), icon: "appointment", color: "accent" },
        { title: "Pacientes Ativos", value: s.customers.toString(), icon: "patients", color: "success" },
        { title: "Vacinas Pendentes", value: "0", icon: "vaccine", color: "warning" },
        { title: "Faturamento (Mês)", value: formatMoney(s.revenue), icon: "revenue", color: "info" },
      ];
    }
    return [
      { title: "Vendas", value: formatMoney(s.revenue), icon: "revenue", color: "accent" },
      { title: "Clientes", value: s.customers.toString(), icon: "patients", color: "success" },
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
              {niche === 'PHYSIOTHERAPY' || niche === 'VETERINARY' ? 'Próximas Consultas' : 'Últimas Vendas'}
            </h3>
            <Link href="/admin/agenda" className="text-sm text-accent font-medium flex items-center gap-1">
              Ver tudo <ArrowRight size={14} />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {dashboardData?.recentOrders && dashboardData.recentOrders.length > 0 ? (
              dashboardData.recentOrders.map((order: any, idx: number) => (
                <div key={idx} className="flex-between p-3 hover:bg-bg-muted rounded-lg transition-all border border-transparent hover:border-border">
                  <div className="flex items-center gap-4">
                    <div className="bg-bg-muted p-2 rounded-md">
                      <Clock size={18} className="text-muted" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {niche === 'RESTAURANT' ? `Pedido #${order.id} - ${order.table}` : 
                         niche === 'RETAIL' ? `Venda #${order.id}` : 
                         niche === 'PHYSIOTHERAPY' ? `Sessão #${order.id}` : 
                         `Consulta #${order.id}`}
                      </p>
                      <p className="text-xs text-muted">
                        {order.time} • {order.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">R$ {order.amount.toFixed(2).replace('.', ',')}</span>
                    <button className="btn-icon">
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <p className="text-muted">Nenhum registro encontrado ainda.</p>
                <p className="text-xs text-muted mt-1">Os dados aparecerão aqui assim que houver movimentação.</p>
              </div>
            )}
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
              {niche === 'VETERINARY' && (
                <>
                  <Link href="/admin/animais" className="flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-all">
                    <Calendar size={18} />
                    <span>Novo Paciente</span>
                  </Link>
                  <Link href="/admin/vacinas" className="flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-all">
                    <FileText size={18} />
                    <span>Lançar Vacina</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex-between mb-4">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Meta Mensal</h3>
              <button className="text-xs text-accent hover:underline" onClick={() => setIsEditingGoal(!isEditingGoal)}>
                {isEditingGoal ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {isEditingGoal ? (
              <div className="flex gap-2 mb-4">
                <input 
                  type="number" 
                  className="input-field input-sm flex-1" 
                  value={goalValue} 
                  onChange={e => setGoalValue(e.target.value)} 
                  placeholder="Valor (R$)" 
                />
                <button className="btn btn-primary btn-sm" onClick={handleSaveGoal}>Salvar</button>
              </div>
            ) : null}

            <div className="w-full bg-bg-muted h-2 rounded-full overflow-hidden mb-2">
              <div className={`h-full ${goalProgress >= 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${goalProgress}%` }}></div>
            </div>
            <div className="flex-between text-xs">
              <span className="font-medium text-secondary">{goalProgress}% da meta atingida</span>
              <span className="text-muted">{formatMoney(currentRevenue)} / {monthlyGoal > 0 ? formatMoney(monthlyGoal) : 'Não definida'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

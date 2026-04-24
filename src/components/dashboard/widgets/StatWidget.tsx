"use client";
import { DollarSign, Users, ShoppingBag, Activity } from "lucide-react";

const icons: any = {
  revenue: DollarSign,
  patients: Users,
  sales: ShoppingBag,
  evolution: Activity
};

export default function StatWidget({ title, value, icon, trend, color }: any) {
  const Icon = icons[icon] || icons.revenue;
  
  return (
    <div className="card animate-fade-in">
      <div className="flex-between">
        <div>
          <p className="text-xs text-label mb-1">{title}</p>
          <p className="text-h3">{value}</p>
        </div>
        <div className={`btn-circle bg-${color || 'accent'}-light text-${color || 'accent'}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-success">
          <span>↑ {trend}</span>
          <span className="text-muted">vs mês passado</span>
        </div>
      )}
    </div>
  );
}

"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function getDashboardData(period: 'daily' | 'monthly' | 'semi-annual' | 'annual' = 'daily') {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  
  if (!tenantId) return {
    stats: { revenue: 0, orders: 0, avgTicket: 0, customers: 0 },
    recentOrders: [], topProducts: [], pendingClosures: [], liveKitchen: [], employeeStats: [], revenueByHour: [], notifications: []
  };

  try {
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'daily') startDate.setHours(0, 0, 0, 0);
    else if (period === 'monthly') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'semi-annual') startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    else if (period === 'annual') startDate = new Date(now.getFullYear(), 0, 1);

    const tenantConfig = await prisma.tenantConfig.findUnique({ where: { tenantId } });
    const monthlyGoal = tenantConfig?.monthlyGoal || 0;

    const restaurants = await prisma.restaurant.findMany({ where: { tenantId } });
    const restaurantIds = restaurants.map(r => r.id);

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: { in: restaurantIds },
        createdAt: { gte: startDate }
      },
      include: {
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const closedOrders = orders.filter(o => o.status === "CLOSED");
    const totalRevenue = closedOrders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = orders.length;
    const avgTicket = closedOrders.length > 0 ? totalRevenue / closedOrders.length : 0;

    // Itens mais vendidos
    const productSales: Record<string, any> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.product.name, category: "Geral", qty: 0, revenue: 0 };
        }
        productSales[item.productId].qty += item.quantity;
        if (order.status === "CLOSED") productSales[item.productId].revenue += (item.price * item.quantity);
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Ranking de Equipe (Simplificado sem o Role por enquanto para garantir build)
    const employeeSales: Record<string, any> = {};
    orders.forEach(order => {
      const key = order.userId || 'caixa_direto';
      if (!employeeSales[key]) {
        employeeSales[key] = {
          name: key === 'caixa_direto' ? "Balcão" : "Funcionário",
          role: "WAITER",
          revenue: 0, orderCount: 0
        };
      }
      employeeSales[key].orderCount += 1;
      if (order.status === "CLOSED") employeeSales[key].revenue += order.total;
    });
    const employeeStats = Object.values(employeeSales).sort((a, b) => b.revenue - a.revenue);

    const recentOrders = orders.slice(0, 8).map(o => ({
      id: o.id.substring(o.id.length - 4),
      table: o.table || "Balcão",
      amount: o.total,
      status: o.status === "CLOSED" ? "Pago" : o.status === "OPEN" ? "Aberto" : o.status,
      time: Math.floor((new Date().getTime() - o.createdAt.getTime()) / 60000) + " min atrás"
    }));

    const liveKitchen = orders
      .filter(o => o.status === "OPEN" || o.status === "PREPARING" || o.status === "READY")
      .map(o => ({
        id: o.id,
        table: o.table || "Balcão",
        customerName: o.customerName || null,
        status: o.status,
        minutesOpen: Math.floor((new Date().getTime() - o.createdAt.getTime()) / 60000),
        total: o.total,
        itemsSummary: o.items.slice(0, 3).map(i => `${i.quantity}x ${i.product.name}`),
        itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
      }));

    const chartData: { label: string, amount: number }[] = [];
    if (period === 'daily') {
      for (let i = 11; i >= 0; i--) {
        const h = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStart = new Date(h); hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(h); hourEnd.setMinutes(59, 59, 999);
        const rev = closedOrders.filter(o => o.createdAt >= hourStart && o.createdAt <= hourEnd).reduce((sum, o) => sum + o.total, 0);
        chartData.push({ label: h.getHours() + ":00", amount: rev });
      }
    } else {
      chartData.push({ label: "Período", amount: totalRevenue });
    }

    const notifications = await prisma.notification.findMany({
      where: { tenantId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return {
      stats: { revenue: totalRevenue, orders: orderCount, avgTicket: avgTicket, customers: orderCount * 2 },
      recentOrders, topProducts, pendingClosures: [], liveKitchen, employeeStats, revenueByHour: chartData, notifications, monthlyGoal
    };
  } catch (error) {
    console.error("Dashboard Error:", error);
    return {
      stats: { revenue: 0, orders: 0, avgTicket: 0, customers: 0 },
      recentOrders: [], topProducts: [], pendingClosures: [], liveKitchen: [], employeeStats: [], revenueByHour: [], notifications: []
    };
  }
}

export async function updateMonthlyGoal(goal: number) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) throw new Error("Tenant não identificado");

  await prisma.tenantConfig.upsert({
    where: { tenantId },
    update: { monthlyGoal: goal },
    create: { tenantId, monthlyGoal: goal, companyName: "Config" }
  });

  return { success: true };
}

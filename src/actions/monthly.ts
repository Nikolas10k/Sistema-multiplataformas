"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function getMonthlyTabs() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return [];

  try {
    const tabs = await prisma.monthlyTab.findMany({
      where: { tenantId, status: "OPEN" },
      orderBy: { customerName: "asc" }
    });
    return tabs;
  } catch (error: any) {
    console.error("ERROR getMonthlyTabs:", error);
    return []; // Retorna lista vazia para evitar crash, o erro será logado no servidor
  }
}

export async function createMonthlyTab(customerName: string, phoneNumber?: string) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    await prisma.monthlyTab.create({
      data: {
        tenantId,
        customerName,
        phoneNumber,
        status: "OPEN",
        balance: 0
      }
    });
    revalidatePath("/admin/mensal");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao criar conta mensal" };
  }
}

export async function addOrderToTab(tabId: string, items: { productId: string, quantity: number, price: number }[]) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  const userId = cookieStore.get("user_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { tenantId } });
    if (!restaurant) return { success: false, message: "Restaurante não encontrado" };

    const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    // 1. Criar o pedido como CLOSED (já que é fiado, ele é "confirmado")
    const order = await prisma.order.create({
      data: {
        tenantId,
        restaurantId: restaurant.id,
        userId: userId || null,
        monthlyTabId: tabId,
        status: "CLOSED", // Marcamos como CLOSED no sentido de 'pedido finalizado'
        paymentMethod: "Fiado/Mensal",
        total,
        items: {
          create: items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price
          }))
        }
      }
    });

    // 2. Atualizar o saldo da conta mensal
    await prisma.monthlyTab.update({
      where: { id: tabId },
      data: {
        balance: { increment: total }
      }
    });

    revalidatePath("/admin/mensal");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao lançar pedido na conta" };
  }
}

export async function settleTab(tabId: string) {
  try {
    await prisma.monthlyTab.update({
      where: { id: tabId },
      data: {
        status: "CLOSED",
        updatedAt: new Date()
      }
    });
    revalidatePath("/admin/mensal");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao dar baixa na conta" };
  }
}

export async function getMonthlyDashboard() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { totalSales: 0, pendingReceivables: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [sales, pending] = await Promise.all([
      prisma.order.aggregate({
        where: { 
          restaurant: { tenantId },
          createdAt: { gte: startOfMonth },
          paymentMethod: "Fiado/Mensal"
        },
        _sum: { total: true }
      }),
      prisma.monthlyTab.aggregate({
        where: { tenantId, status: "OPEN" },
        _sum: { balance: true }
      })
    ]);

    return {
      totalSales: sales._sum.total || 0,
      pendingReceivables: pending._sum.balance || 0
    };
  } catch (error) {
    console.error("ERROR getMonthlyDashboard:", error);
    return { totalSales: 0, pendingReceivables: 0 };
  }
}

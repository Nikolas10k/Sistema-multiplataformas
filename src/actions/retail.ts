"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenant() {
  const cookieStore = await cookies();
  return cookieStore.get("tenant_id")?.value;
}

export async function createSale(data: { customerName?: string, items: { productId: string, quantity: number, price: number }[], paymentMethod: string }) {
  const tenantId = await getTenant();
  if (!tenantId) throw new Error("Tenant não identificado");

  // No varejo, o "Restaurant" pode ser visto como uma "Loja" ou "Unidade"
  // Para simplificar se não houver um restaurante específico, pegamos o primeiro do tenant
  let restaurant = await prisma.restaurant.findFirst({ where: { tenantId } });
  
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name: "Loja Principal", tenantId }
    });
  }

  const total = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const sale = await prisma.order.create({
    data: {
      tenantId,
      restaurantId: restaurant.id,
      customerName: data.customerName,
      paymentMethod: data.paymentMethod,
      total,
      status: "COMPLETED",
      items: {
        create: data.items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price
        }))
      }
    }
  });

  revalidatePath("/admin/vendas");
  return { success: true, sale };
}

export async function getSales() {
  const tenantId = await getTenant();
  if (!tenantId) return [];

  return await prisma.order.findMany({
    where: { tenantId },
    include: {
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateStock(productId: string, quantity: number) {
  // Simplificado: No schema atual Product não tem campo 'stock'
  // Mas no varejo precisamos disso. Vou assumir por enquanto que
  // as consultas de estoque são baseadas em entradas/saídas ou 
  // que o usuário quer apenas a listagem por enquanto.
  // TODO: Adicionar campo stock ao Product ou criar InventoryTransaction
  
  revalidatePath("/admin/estoque");
  return { success: true };
}

"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function createOrder(data: {
  table?: string;
  customerName?: string;
  items: { productId: string; quantity: number; notes?: string; price: number }[];
  status?: string;
  paymentMethod?: string;
  cpf?: string;
  notalegal?: boolean;
}) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  const userId = cookieStore.get("user_id")?.value;
  
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    let restaurant = await prisma.restaurant.findFirst({ where: { tenantId } });
    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          tenantId,
          name: "Sede Principal"
        }
      });
    }

    // Se o pagamento for dinheiro, o pedido já nasce FECHADO
    const finalStatus = data.paymentMethod === "Dinheiro" ? "CLOSED" : (data.status || "OPEN");
    const total = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const order = await prisma.order.create({
      data: {
        tenantId,
        restaurantId: restaurant.id,
        userId: userId || null,
        table: data.table || "Balcão",
        customerName: data.customerName || null,
        status: finalStatus,
        paymentMethod: data.paymentMethod || null,
        cpf: data.cpf || null,
        notalegal: data.notalegal || false,
        total,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes
          }))
        }
      }
    });

    return { success: true, orderId: order.id, createdAt: order.createdAt };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, message: "Erro ao criar pedido" };
  }
}

export async function openComanda(table: string, customerName?: string) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  const userId = cookieStore.get("user_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    let restaurant = await prisma.restaurant.findFirst({ where: { tenantId } });
    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          tenantId,
          name: "Sede Principal"
        }
      });
    }

    const order = await prisma.order.create({
      data: {
        tenantId,
        restaurantId: restaurant.id,
        userId: userId || null,
        table,
        customerName: customerName || null,
        status: "OPEN",
        total: 0
      }
    });
    return { success: true, orderId: order.id, createdAt: order.createdAt };
  } catch (error) {
    return { success: false, message: "Erro ao abrir comanda" };
  }
}

export async function addItemsToOrder(orderId: string, items: { productId: string; quantity: number; notes?: string; price: number }[]) {
  try {
    const totalAddition = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    await prisma.orderItem.createMany({
      data: items.map(item => ({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes
      }))
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        total: { increment: totalAddition },
        status: "PREPARING"
      }
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao adicionar itens" };
  }
}

export async function requestOrderClosure(orderId: string) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CLOSING_REQUESTED" }
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao solicitar fechamento" };
  }
}

export async function confirmPayment(orderId: string, fiscalData?: { cpf?: string, notalegal?: boolean }) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: "CLOSED",
        cpf: fiscalData?.cpf,
        notalegal: fiscalData?.notalegal || false
      },
      include: { restaurant: true }
    });

    // Notificar admin
    await prisma.notification.create({
      data: {
        tenantId: order.restaurant.tenantId,
        message: `Mesa ${order.table || order.id} do cliente ${order.customerName || 'N/I'} fechada`
      }
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao confirmar pagamento" };
  }
}

export async function finalizeOrderPayment(orderId: string, data: { paymentMethod: string, cpf?: string, notalegal?: boolean }) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: "CLOSED",
        paymentMethod: data.paymentMethod,
        cpf: data.cpf,
        notalegal: data.notalegal || false
      },
      include: { restaurant: true }
    });

    // Notificar admin
    await prisma.notification.create({
      data: {
        tenantId: order.restaurant.tenantId,
        message: `Mesa ${order.table || order.id} do cliente ${order.customerName || 'N/I'} fechada`
      }
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao finalizar pagamento" };
  }
}

export async function getOpenOrders() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { success: false, message: "Sessão expirada" };

  try {
    const orders = await prisma.order.findMany({
      where: {
        restaurant: { tenantId },
        status: { in: ["OPEN", "PREPARING", "READY", "CLOSING_REQUESTED", "BILL_PRINTED"] }
      },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, orders };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao buscar comandas" };
  }
}

export async function getOrderDetails(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });
    if (!order) return { success: false, message: "Pedido não encontrado" };
    return { success: true, order };
  } catch (error) {
    return { success: false, message: "Erro ao buscar detalhes" };
  }
}

export async function getOrderStatus(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    });
    if (!order) return { success: false, message: "Pedido não encontrado" };
    return { success: true, status: order.status };
  } catch (error) {
    return { success: false, message: "Erro ao buscar status" };
  }
}

export async function printBill(orderId: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "BILL_PRINTED" },
      include: {
        items: { include: { product: true } }
      }
    });
    
    let printText = `================================\n`;
    printText += `          RestoGestão          \n`;
    printText += `================================\n`;
    printText += `Comanda: ${order.table || order.customerName || order.id}\n`;
    printText += `Data: ${new Date().toLocaleString()}\n`;
    printText += `--------------------------------\n`;
    
    order.items.forEach(i => {
      printText += `${i.quantity}x ${i.product.name.padEnd(20).substring(0,20)} R$ ${(i.quantity * i.price).toFixed(2)}\n`;
    });
    
    printText += `--------------------------------\n`;
    printText += `TOTAL:                  R$ ${order.total.toFixed(2)}\n`;
    printText += `================================\n`;
    printText += `     Obrigado pela preferência! \n`;

    return { success: true, printData: printText };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao gerar conta" };
  }
}

export async function getWaiterStats() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) return { success: false, message: "Não autenticado" };

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: today }
      }
    });

    const totalCount = orders.length;
    const totalValue = orders.reduce((acc, o) => acc + o.total, 0);

    return { success: true, stats: { totalCount, totalValue } };
  } catch (error) {
    return { success: false, message: "Erro ao buscar estatísticas" };
  }
}

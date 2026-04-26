"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenantId(): Promise<string> {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) throw new Error("Não autenticado");
  return tenantId;
}

// ─────────────────────────────────────────
//  SERVICES
// ─────────────────────────────────────────

export async function getServices() {
  const tenantId = await getTenantId();
  try {
    return await prisma.service.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createService(data: {
  name: string;
  description?: string;
  category: string;
  type: string;
  price: number;
  sessions: number;
  validityDays?: number;
  active?: boolean;
}) {
  const tenantId = await getTenantId();
  try {
    const service = await prisma.service.create({
      data: { ...data, tenantId, active: data.active ?? true },
    });
    revalidatePath("/admin/vendas/servicos");
    return { success: true, service };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro ao criar serviço" };
  }
}

export async function updateService(
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    type?: string;
    price?: number;
    sessions?: number;
    validityDays?: number;
    active?: boolean;
  }
) {
  const tenantId = await getTenantId();
  try {
    const service = await prisma.service.update({
      where: { id, tenantId },
      data,
    });
    revalidatePath("/admin/vendas/servicos");
    return { success: true, service };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro ao atualizar serviço" };
  }
}

export async function deleteService(id: string) {
  const tenantId = await getTenantId();
  try {
    await prisma.service.update({
      where: { id, tenantId },
      data: { active: false },
    });
    revalidatePath("/admin/vendas/servicos");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro ao remover serviço" };
  }
}

// ─────────────────────────────────────────
//  SALES
// ─────────────────────────────────────────

export async function getSales(filters?: {
  patientName?: string;
  status?: string;
  paymentMethod?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const tenantId = await getTenantId();
  try {
    const where: any = { tenantId };

    if (filters?.status) where.status = filters.status;
    if (filters?.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters?.fromDate || filters?.toDate) {
      where.saleDate = {};
      if (filters.fromDate) where.saleDate.gte = new Date(filters.fromDate);
      if (filters.toDate) where.saleDate.lte = new Date(filters.toDate + "T23:59:59");
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, document: true } },
        items: {
          include: {
            service: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by patient name (in-memory) after fetch
    if (filters?.patientName) {
      return sales.filter((s) =>
        s.patient.name.toLowerCase().includes(filters.patientName!.toLowerCase())
      );
    }

    return sales;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function getSaleById(id: string) {
  const tenantId = await getTenantId();
  try {
    return await prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        items: {
          include: { service: true },
        },
      },
    });
  } catch {
    return null;
  }
}

export async function createSale(data: {
  patientId: string;
  attendanceType: string;
  paymentMethod?: string;
  notes?: string;
  discountValue?: number;
  amountPaid?: number;
  dueDate?: string;
  items: {
    serviceId: string;
    quantity: number;
    unitPrice: number;
    discountItem: number;
    sessionsTotal: number;
  }[];
}) {
  const tenantId = await getTenantId();
  try {
    // Get next sale number for this tenant
    const lastSale = await prisma.sale.findFirst({
      where: { tenantId },
      orderBy: { saleNumber: "desc" },
      select: { saleNumber: true },
    });
    const saleNumber = (lastSale?.saleNumber ?? 0) + 1;

    const subtotal = data.items.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity - item.discountItem,
      0
    );
    const discountValue = data.discountValue ?? 0;
    const total = Math.max(0, subtotal - discountValue);
    const amountPaid = data.amountPaid ?? 0;
    const status =
      amountPaid >= total
        ? "PAID"
        : amountPaid > 0
        ? "PARTIAL"
        : "PENDING";

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        tenantId,
        patientId: data.patientId,
        subtotal,
        discountValue,
        total,
        amountPaid,
        status,
        paymentMethod: data.paymentMethod,
        attendanceType: data.attendanceType,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        items: {
          create: data.items.map((item) => {
            const totalItem = item.unitPrice * item.quantity - item.discountItem;
            return {
              serviceId: item.serviceId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountItem: item.discountItem,
              totalItem,
              sessionsTotal: item.sessionsTotal,
              sessionsUsed: 0,
            };
          }),
        },
      },
      include: {
        patient: true,
        items: { include: { service: true } },
      },
    });

    revalidatePath("/admin/vendas");
    return { success: true, sale };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro ao criar venda" };
  }
}

export async function registerPayment(id: string, amountPaid: number) {
  const tenantId = await getTenantId();
  try {
    const sale = await prisma.sale.findFirst({ where: { id, tenantId } });
    if (!sale) return { success: false, message: "Venda não encontrada" };

    const newAmountPaid = Math.min(sale.total, amountPaid);
    const status =
      newAmountPaid >= sale.total
        ? "PAID"
        : newAmountPaid > 0
        ? "PARTIAL"
        : "PENDING";

    const updated = await prisma.sale.update({
      where: { id },
      data: { amountPaid: newAmountPaid, status },
    });

    revalidatePath("/admin/vendas");
    return { success: true, sale: updated };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro ao registrar pagamento" };
  }
}

export async function cancelSale(id: string) {
  const tenantId = await getTenantId();
  try {
    await prisma.sale.update({
      where: { id, tenantId },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/admin/vendas");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro ao cancelar venda" };
  }
}

export async function incrementSessionUsed(saleItemId: string) {
  try {
    const item = await prisma.saleItem.findUnique({ where: { id: saleItemId } });
    if (!item) return { success: false, message: "Item não encontrado" };
    if (item.sessionsUsed >= item.sessionsTotal) {
      return { success: false, message: "Todas as sessões já foram utilizadas" };
    }
    if (item.expiresAt && item.expiresAt < new Date()) {
      return { success: false, message: "Pacote vencido" };
    }

    await prisma.saleItem.update({
      where: { id: saleItemId },
      data: { sessionsUsed: { increment: 1 } },
    });
    revalidatePath("/admin/vendas");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro ao registrar sessão" };
  }
}

export async function getSalesSummary() {
  const tenantId = await getTenantId();
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, paid, pending, count] = await Promise.all([
      prisma.sale.aggregate({ where: { tenantId, status: { not: "CANCELLED" } }, _sum: { total: true } }),
      prisma.sale.aggregate({ where: { tenantId, status: { not: "CANCELLED" } }, _sum: { amountPaid: true } }),
      prisma.sale.aggregate({ where: { tenantId, status: { in: ["PENDING", "PARTIAL"] } }, _sum: { total: true, amountPaid: true } }),
      prisma.sale.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
    ]);

    const totalValue = total._sum.total ?? 0;
    const paidValue = paid._sum.amountPaid ?? 0;
    const pendingValue = (pending._sum.total ?? 0) - (pending._sum.amountPaid ?? 0);

    return { totalValue, paidValue, pendingValue, monthCount: count };
  } catch {
    return { totalValue: 0, paidValue: 0, pendingValue: 0, monthCount: 0 };
  }
}

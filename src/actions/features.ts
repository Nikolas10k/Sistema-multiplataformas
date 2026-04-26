"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function getMyTenantContext() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  const role = cookieStore.get("user_role")?.value;
  
  // Forçar revalidação para evitar cache em dispositivos mobile
  revalidatePath("/", "layout");
  
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.length < 5) {
    if (role === "PLATFORM_ADMIN") {
      return {
        features: ["dashboard.analytics", "platform.tenants"],
        niche: "GENERAL",
        config: { primaryColor: "#4f46e5", companyName: "Plataforma Master" }
      };
    }
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      niche: true,
      config: true,
      modules: { where: { enabled: true } },
      plan: true
    }
  });

  if (!tenant) return null;

  const features = new Set<string>();
  
  // Módulos como features
  tenant.modules.forEach(m => features.add(m.moduleKey));
  
  // Features do plano (simplificado para o novo schema)
  if (tenant.plan.code === 'pro') features.add('reports.advanced');
  if (tenant.plan.code === 'max') {
    features.add('reports.advanced');
    features.add('multiunit.enabled');
  }

  const nicheCode = tenant.niche.code;
  const defaultColors: Record<string, { primary: string, secondary: string }> = {
    'PHYSIOTHERAPY': { primary: "#10b981", secondary: "#064e3b" }, // Verde
    'RESTAURANT': { primary: "#f97316", secondary: "#7c2d12" },    // Laranja
    'RETAIL': { primary: "#3b82f6", secondary: "#1e3a8a" },        // Azul
    'VETERINARY': { primary: "#eab308", secondary: "#713f12" },    // Amarelo
  };

  const theme = defaultColors[nicheCode] || { primary: "#4f46e5", secondary: "#1e293b" };

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantDomain: (tenant as any).domain || tenant.slug,
    tenantLogo: (tenant as any).logoUrl || null,
    tenantEmail: (tenant as any).email || "",
    tenantPhone: (tenant as any).phone || "",
    tenantAddress: (tenant as any).address || "",
    features: Array.from(features),
    niche: nicheCode,
    config: {
      primaryColor: tenant.config?.primaryColor || theme.primary,
      secondaryColor: tenant.config?.secondaryColor || theme.secondary,
      companyName: tenant.config?.companyName || tenant.name,
      logoUrl: (tenant as any).logoUrl,
      document: (tenant as any).document,
      email: (tenant as any).email,
      phone: (tenant as any).phone,
      address: (tenant as any).address,
    }
  };
}

export async function updateTenantProfile(data: { document?: string, email?: string, phone?: string, address?: string }) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  
  if (!tenantId) {
    return { success: false, message: "Tenant não identificado" };
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        document: data.document,
        email: data.email,
        phone: data.phone,
        address: data.address
      }
    });

    revalidatePath("/admin/settings");
    return { success: true, tenant: updated };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao atualizar dados" };
  }
}

export async function getUnreadNotifications() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return [];

  try {
    return await prisma.notification.findMany({
      where: { tenantId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
  } catch (error) {
    return [];
  }
}

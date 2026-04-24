"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function getMyTenantContext() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  const role = cookieStore.get("user_role")?.value;
  
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

  return {
    features: Array.from(features),
    niche: tenant.niche.code,
    config: {
      primaryColor: tenant.config?.primaryColor || "#4f46e5",
      secondaryColor: tenant.config?.secondaryColor || "#1e293b",
      companyName: tenant.config?.companyName || tenant.name,
      logoUrl: tenant.config?.logoUrl,
    }
  };
}

"use server";

import { prisma } from "@/lib/prisma";
import { getMyTenantContext } from "./features";
import { revalidatePath } from "next/cache";

export async function saveTenantSettings(data: {
  // Dados do Tenant
  name?: string,
  email?: string,
  phone?: string,
  document?: string,
  address?: string,
  logoUrl?: string,
  // Dados do Config
  primaryColor?: string,
  secondaryColor?: string,
  companyName?: string
}) {
  const context = await getMyTenantContext();
  if (!context?.tenantId) throw new Error("Não autorizado");

  // 1. Atualizar o Tenant principal
  await (prisma.tenant as any).update({
    where: { id: context.tenantId },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      address: data.address,
      logoUrl: data.logoUrl
    }
  });

  // 2. Atualizar ou criar o TenantConfig
  await (prisma.tenantConfig as any).upsert({
    where: { tenantId: context.tenantId },
    update: {
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      companyName: data.companyName || data.name
    },
    create: {
      tenantId: context.tenantId,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      companyName: data.companyName || data.name
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { success: true };
}

"use server";

import { prisma } from "@/lib/prisma";
import { getMyTenantContext } from "./features";
import { revalidatePath } from "next/cache";

export async function updateTenantLogo(logoUrl: string) {
  const context = await getMyTenantContext();
  if (!context?.tenantId) throw new Error("Não autorizado");

  await (prisma.tenant as any).update({
    where: { id: context.tenantId },
    data: { logoUrl }
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateTenantSettings(data: { 
  name: string, 
  domain: string,
  email?: string,
  phone?: string,
  address?: string
}) {
  const context = await getMyTenantContext();
  if (!context?.tenantId) throw new Error("Não autorizado");

  await (prisma.tenant as any).update({
    where: { id: context.tenantId },
    data: { 
      name: data.name,
      domain: data.domain,
      email: data.email,
      phone: data.phone,
      address: data.address
    }
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateTenantBranding(data: { 
  logoUrl?: string, 
  primaryColor?: string,
  secondaryColor?: string
}) {
  const context = await getMyTenantContext();
  if (!context?.tenantId) throw new Error("Não autorizado");

  // Update main Tenant logo
  if (data.logoUrl) {
    await (prisma.tenant as any).update({
      where: { id: context.tenantId },
      data: { logoUrl: data.logoUrl }
    });
  }

  // Update or create TenantConfig
  await (prisma.tenantConfig as any).upsert({
    where: { tenantId: context.tenantId },
    update: {
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor
    },
    create: {
      tenantId: context.tenantId,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor
    }
  });

  revalidatePath("/", "layout");
  return { success: true };
}

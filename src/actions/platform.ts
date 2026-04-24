"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function checkAuth(role: string | undefined) {
  if (role !== "PLATFORM_ADMIN") {
    throw new Error("Não autorizado");
  }
}

export async function getPlatformStats() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  checkAuth(role);

  const tenants = await prisma.tenant.findMany({
    include: { 
      plan: true,
      niche: true,
      users: {
        include: { user: true, role: true },
        take: 1
      }
    }
  });
  const plans = await prisma.plan.findMany();
  const niches = await prisma.nicheType.findMany();

  const totalClients = tenants.length;
  const activeClients = tenants.filter(t => t.status === "ACTIVE").length;

  const planStats = plans.map(p => {
    const tenantsInPlan = tenants.filter(t => t.planId === p.id);
    const count = tenantsInPlan.length;
    const revenue = tenantsInPlan.reduce((acc, t) => acc + p.priceMonthly, 0);
    return { id: p.id, name: p.name, count, revenue, code: p.code };
  });

  const mrr = planStats.reduce((acc, curr) => acc + curr.revenue, 0);

  return {
    totalClients,
    activeClients,
    mrr,
    planStats,
    tenants,
    niches
  };
}

export async function createTenant(data: { 
  name: string, 
  slug: string, 
  nicheId: string, 
  planId: string, 
  adminName: string, 
  adminUser: string, 
  adminPass: string 
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  checkAuth(role);

  try {
    const existingUser = await prisma.user.findUnique({ where: { username: data.adminUser } });
    if (existingUser) return { success: false, message: "Username do admin já existe" };

    const existingSlug = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existingSlug) return { success: false, message: "Slug já está em uso" };

    const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!roleAdmin) return { success: false, message: "Papel ADMIN não encontrado" };

    // Criar Inquilino (Tenant)
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        nicheId: data.nicheId,
        planId: data.planId,
        status: "ACTIVE",
        config: {
          create: {
            companyName: data.name
          }
        }
      },
      include: { niche: true, plan: true }
    });

    // Definir Módulos por Nicho e Plano
    let baseModules = ["products.manage", "reports.advanced", "employees.manage", "inventory.basic"];
    let nicheModules: string[] = [];
    
    // Restrição do plano Start para Restaurantes
    if (tenant.niche.code === 'RESTAURANT') {
      nicheModules = ["pdv.basic", "billing.basic"];
      if (tenant.plan.code === 'start') {
        // No plano start de restaurante, remover extras
        baseModules = ["products.manage"]; // Apenas produtos e o dashboard (que é base)
      }
    } else if (tenant.niche.code === 'PHYSIOTHERAPY') {
      nicheModules = ["patients.manage", "calendar.enabled", "clinical_files"];
    } else if (tenant.niche.code === 'RETAIL') {
      nicheModules = ["sales.basic"];
    }

    const allModules = [...baseModules, ...nicheModules];

    await prisma.tenantModule.createMany({
      data: allModules.map(m => ({
        tenantId: tenant.id,
        moduleKey: m,
        enabled: true
      }))
    });

    // Criar Usuário e Vínculo
    const user = await prisma.user.create({
      data: {
        name: data.adminName,
        username: data.adminUser,
        password: data.adminPass,
      }
    });

    await prisma.userTenantRole.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        roleId: roleAdmin.id
      }
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao criar cliente" };
  }
}

export async function toggleTenantStatus(id: string, currentStatus: string) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  checkAuth(role);

  try {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await prisma.tenant.update({
      where: { id },
      data: { status: newStatus }
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao alterar status" };
  }
}

export async function deleteTenant(id: string) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  checkAuth(role);

  try {
    await prisma.tenant.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao excluir cliente" };
  }
}

export async function updateTenant(id: string, data: { 
  name: string, 
  slug: string, 
  nicheId: string, 
  planId: string, 
  adminName?: string, 
  adminUser?: string, 
  adminPass?: string 
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  checkAuth(role);

  try {
    // Atualizar Tenant
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        nicheId: data.nicheId,
        planId: data.planId,
      }
    });

    // Se houver dados do admin para atualizar
    if (data.adminUser || data.adminPass || data.adminName) {
      const userRole = await prisma.userTenantRole.findFirst({
        where: { tenantId: id, role: { name: 'ADMIN' } },
        include: { user: true }
      });

      if (userRole) {
        await prisma.user.update({
          where: { id: userRole.userId },
          data: {
            name: data.adminName || undefined,
            username: data.adminUser || undefined,
            password: data.adminPass || undefined,
          }
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao atualizar cliente" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function createUser(data: any) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    const customPermissions = data.permissions ? JSON.stringify(data.permissions) : null;
    
    const existing = await prisma.user.findUnique({
      where: { username: data.username }
    });
    
    if (existing) {
      // Verifica se ele já tem acesso a este tenant
      const hasAccess = await prisma.userTenantRole.findUnique({
        where: { userId_tenantId: { userId: existing.id, tenantId } }
      });
      if (hasAccess) {
        return { success: false, message: "Este usuário já está cadastrado nesta empresa." };
      }
      
      // Se ele existe mas não tem acesso, apenas vinculamos
      const role = await prisma.role.findUnique({ where: { name: data.role || 'WAITER' } });
      await prisma.userTenantRole.create({
        data: {
          userId: existing.id,
          tenantId,
          roleId: role?.id || "",
          customPermissions
        }
      });
      return { success: true };
    }

    const role = await prisma.role.findUnique({ where: { name: data.role || 'WAITER' } });
    
    // Criar usuário novo e vincular
    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
      }
    });

    await prisma.userTenantRole.create({
      data: {
        userId: user.id,
        tenantId,
        roleId: role?.id || "",
        customPermissions
      }
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao criar funcionário" };
  }
}

export async function updateUser(id: string, data: any) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    if (data.username) {
      const existing = await prisma.user.findUnique({
        where: { username: data.username }
      });
      if (existing && existing.id !== id) {
        return { success: false, message: "Este usuário já está em uso." };
      }
    }

    const { role: newRole, permissions, ...userData } = data;
    
    if (!userData.password) delete userData.password;

    await prisma.user.update({
      where: { id },
      data: userData
    });

    const customPermissions = permissions ? JSON.stringify(permissions) : null;

    if (newRole) {
      const role = await prisma.role.findUnique({ where: { name: newRole } });
      if (role) {
        await prisma.userTenantRole.upsert({
          where: { userId_tenantId: { userId: id, tenantId } },
          update: { roleId: role.id, customPermissions },
          create: { userId: id, tenantId, roleId: role.id, customPermissions }
        });
      }
    } else {
      // Just update permissions if role isn't changing but permissions might be
      await prisma.userTenantRole.update({
        where: { userId_tenantId: { userId: id, tenantId } },
        data: { customPermissions }
      });
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao atualizar funcionário" };
  }
}

export async function deleteUser(id: string) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get("user_id")?.value;
  const tenantId = cookieStore.get("tenant_id")?.value;

  if (currentUserId === id) {
    return { success: false, message: "Você não pode excluir a sua própria conta." };
  }

  try {
    // Remove apenas o vínculo com este tenant
    await prisma.userTenantRole.delete({
      where: { userId_tenantId: { userId: id, tenantId: tenantId! } }
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao remover funcionário" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function login(username: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { 
        tenants: {
          include: { tenant: true, role: true }
        }
      }
    });

    if (!user) {
      return { success: false, message: "Usuário não encontrado" };
    }

    if (user.password !== password) {
      return { success: false, message: "Senha incorreta" };
    }

    const cookieStore = await cookies();
    cookieStore.set("user_id", user.id, { secure: true, httpOnly: true, sameSite: 'lax' });
    cookieStore.set("user_name", user.name, { secure: true, httpOnly: true, sameSite: 'lax' });

    if (user.isPlatformAdmin) {
      cookieStore.set("user_role", "PLATFORM_ADMIN", { secure: true, httpOnly: true, sameSite: 'lax' });
      cookieStore.delete("tenant_id");
      return { 
        success: true, 
        user: { id: user.id, name: user.name, role: "PLATFORM_ADMIN", tenantName: "Plataforma Master" } 
      };
    }

    // Se o usuário tem acesso a tenants
    if (user.tenants.length > 0) {
      const activeTenant = user.tenants[0]; // Pega o primeiro tenant por padrão
      cookieStore.set("user_role", activeTenant.role.name, { secure: true, httpOnly: true, sameSite: 'lax' });
      cookieStore.set("tenant_id", activeTenant.tenantId, { secure: true, httpOnly: true, sameSite: 'lax' });
      
      return { 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          role: activeTenant.role.name,
          tenantName: activeTenant.tenant.name
        } 
      };
    }

    return { success: false, message: "Usuário sem vínculo com empresas" };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Erro interno no servidor" };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("user_id");
  cookieStore.delete("user_name");
  cookieStore.delete("user_role");
  cookieStore.delete("tenant_id");
}

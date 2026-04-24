"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function createRestaurant(data: { name: string, location?: string, isOpen: boolean }) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    await prisma.restaurant.create({
      data: {
        name: data.name,
        location: data.location || null,
        isOpen: data.isOpen,
        tenantId
      }
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao criar restaurante" };
  }
}

export async function toggleRestaurantStatus(id: string, isOpen: boolean) {
  try {
    await prisma.restaurant.update({
      where: { id },
      data: { isOpen }
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao atualizar status" };
  }
}

export async function deleteRestaurant(id: string) {
  try {
    await prisma.restaurant.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Não é possível excluir restaurante com vendas associadas" };
  }
}

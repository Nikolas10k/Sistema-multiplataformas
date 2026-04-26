"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function createProduct(data: any) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    let category = await prisma.category.findFirst({
      where: { name: data.categoryName, tenantId }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: data.categoryName, tenantId }
      });
    }

    await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        imageUrl: data.imageUrl,
        categoryId: category.id,
        tenantId,
        active: data.active !== undefined ? data.active : true
      }
    });

    // Notificação de estoque baixo (<= 5)
    if (data.stock <= 5) {
      await prisma.notification.create({
        data: {
          tenantId,
          message: `Estoque Baixo: ${data.name} está com apenas ${data.stock} unidade(s).`
        }
      });
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao criar produto" };
  }
}

export async function updateProduct(id: string, data: any) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return { success: false, message: "Não autenticado" };

  try {
    let category = await prisma.category.findFirst({
      where: { name: data.categoryName, tenantId }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: data.categoryName, tenantId }
      });
    }

    await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        imageUrl: data.imageUrl,
        categoryId: category.id,
        active: data.active
      }
    });

    // Notificação de estoque baixo
    if (data.stock <= 5) {
      await prisma.notification.create({
        data: {
          tenantId,
          message: `Estoque Baixo: ${data.name} está com apenas ${data.stock} unidade(s).`
        }
      });
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao atualizar produto" };
  }
}

export async function deleteProduct(id: string) {
  try {
    // Note: Em produção real, faríamos um "soft delete" (active: false) 
    // se o produto já estiver atrelado a algum OrderItem para não quebrar relatórios.
    // Para protótipo, podemos excluir, mas se falhar por Foreign Key, fazemos soft delete.
    try {
      await prisma.product.delete({ where: { id } });
    } catch(e) {
      // Falha de Foreign Key: Produto já foi vendido. Fazer Soft Delete.
      await prisma.product.update({ where: { id }, data: { active: false } });
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao excluir produto" };
  }
}

export async function getCategories() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  if (!tenantId) return [];

  return await prisma.category.findMany({
    where: { tenantId }
  });
}

"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function getProductsAndCategories() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;
  
  if (!tenantId) return { products: [], categories: [] };

  try {
    const categories = await prisma.category.findMany({
      where: { tenantId }
    });
    const products = await prisma.product.findMany({
      where: { 
        tenantId,
        active: true
      },
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    });

    // Dedup products by name
    const uniqueProductsMap = new Map();
    for (const p of products) {
      if (!uniqueProductsMap.has(p.name)) {
        uniqueProductsMap.set(p.name, p);
      }
    }
    const uniqueProducts = Array.from(uniqueProductsMap.values());

    // Map to the format needed by UI
    const formattedProducts = uniqueProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description,
      category: p.category?.name || "Geral",
      image: p.imageUrl || "🍔" // fallback if no image
    }));

    return { 
      products: formattedProducts, 
      categories: ["Todos", ...Array.from(new Set(categories.map(c => c.name)))]
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], categories: [] };
  }
}

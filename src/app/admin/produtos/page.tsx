import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import ProductManager from "./ProductManager";

export default async function AdminProdutos() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;

  if (!tenantId) return <div>Não autenticado</div>;

  const products = await prisma.product.findMany({
    where: { tenantId },
    include: { category: true },
    orderBy: { name: 'asc' }
  });

  const categories = await prisma.category.findMany({
    where: { tenantId }
  });

  return <ProductManager initialProducts={products} categories={categories} />;
}

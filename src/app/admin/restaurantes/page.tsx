import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import RestaurantManager from "./RestaurantManager";

export default async function AdminRestaurantes() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;

  if (!tenantId) return <div>Não autenticado</div>;

  const restaurants = await prisma.restaurant.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' }
  });

  return <RestaurantManager initialRestaurants={restaurants} />;
}

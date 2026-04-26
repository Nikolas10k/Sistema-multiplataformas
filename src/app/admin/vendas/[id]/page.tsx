import { getSaleById } from "@/actions/sales";
import { getMyTenantContext } from "@/actions/features";
import SaleDetail from "./SaleDetail";
import { notFound } from "next/navigation";

export default async function SalePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const [sale, context] = await Promise.all([getSaleById(id), getMyTenantContext()]);

  if (!sale) notFound();

  return <SaleDetail sale={sale} context={context} />;
}

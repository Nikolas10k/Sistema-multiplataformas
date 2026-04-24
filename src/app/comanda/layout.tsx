import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasFeature } from "@/lib/auth";

export default async function ComandaLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;

  if (!tenantId) {
    redirect("/");
  }

  const isEnabled = await hasFeature(tenantId, "orders.comanda");
  if (!isEnabled) {
    // Pode redirecionar para uma página de "Upgrade needed" ou de volta pro menu
    return (
      <div className="flex-center min-h-screen text-center p-6">
        <div>
          <h2 className="text-h2 mb-4">Módulo não contratado</h2>
          <p className="text-muted mb-6">As comandas eletrônicas estão disponíveis a partir do Plano Pro.</p>
          <a href="/" className="btn btn-primary">Voltar ao Início</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

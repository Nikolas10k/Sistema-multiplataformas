import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasFeature } from "@/lib/auth";

export default async function PDVLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;

  if (!tenantId) {
    redirect("/");
  }

  const isEnabled = await hasFeature(tenantId, "pdv.basic");
  if (!isEnabled) {
    return (
      <div className="flex-center min-h-screen text-center p-6">
        <div>
          <h2 className="text-h2 mb-4">Módulo não contratado</h2>
          <p className="text-muted mb-6">A frente de caixa não está disponível no seu plano.</p>
          <a href="/" className="btn btn-primary">Voltar ao Início</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

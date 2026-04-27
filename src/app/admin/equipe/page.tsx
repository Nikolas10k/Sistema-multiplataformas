import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import UserManager from "./UserManager";

export default async function AdminEquipe() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;

  if (!tenantId) return <div>Não autenticado</div>;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { niche: true }
  });

  const userRoles = await prisma.userTenantRole.findMany({
    where: { tenantId },
    include: {
      user: true,
      role: true
    },
    orderBy: { user: { name: 'asc' } }
  });

  const users = userRoles.map(ur => ({
    ...ur.user,
    role: ur.role.name,
    permissions: ur.customPermissions ? JSON.parse(ur.customPermissions) : []
  }));

  return <UserManager initialUsers={users} niche={tenant?.niche?.code || 'GENERAL'} />;
}

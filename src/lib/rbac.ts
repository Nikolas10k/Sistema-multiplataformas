import { prisma } from "./prisma";

export async function checkPermission(userId: string, tenantId: string, resource: string, action: string) {
  const userRole = await prisma.userTenantRole.findUnique({
    where: {
      userId_tenantId: { userId, tenantId }
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  if (!userRole) return false;

  return userRole.role.permissions.some(rp => 
    rp.permission.resource === resource && 
    (rp.permission.action === action || rp.permission.action === 'manage')
  );
}

export async function getTenantNiche(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { niche: true }
  });
  return tenant?.niche.code;
}

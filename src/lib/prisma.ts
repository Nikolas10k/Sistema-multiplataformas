import { PrismaClient } from "@prisma/client";
import { tenantContext } from "./tenant-context";
import { cookies } from "next/headers";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        let context = tenantContext.get();
        
        // Em Next.js Server Components/Actions, se não tiver contexto manual,
        // tentamos pegar dos cookies.
        if (!context) {
          try {
            const cookieStore = await cookies();
            const tenantId = cookieStore.get("tenant_id")?.value;
            const userId = cookieStore.get("user_id")?.value;
            const role = cookieStore.get("user_role")?.value;
            
            if (tenantId) {
              context = { tenantId, userId: userId || "", role: role || "" };
            }
          } catch (e) {
            // Em builds estáticos ou fora do contexto de request, cookies() falha.
          }
        }

        const globalModels = ["Plan", "NicheType", "User", "Role", "Permission", "RolePermission", "DashboardWidget"];
        
        if (!context?.tenantId || globalModels.includes(model)) {
          return query(args);
        }

        // Se o modelo for 'Tenant', o ID do tenant é o campo 'id'
        if (model === "Tenant") {
          if (["findUnique", "findFirst", "update", "delete", "upsert"].includes(operation)) {
            const castArgs = args as any;
            castArgs.where = { ...castArgs.where, id: context.tenantId };
          }
          return query(args);
        }

        // Para os demais modelos, injetamos 'tenantId' no 'where'
        if (["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"].includes(operation)) {
          const castArgs = args as any;
          castArgs.where = { ...castArgs.where, tenantId: context.tenantId };
        }

        // Para criação, garantimos que o tenantId seja o correto
        if (["create", "createMany"].includes(operation)) {
          const castArgs = args as any;
          if (Array.isArray(castArgs.data)) {
            castArgs.data = castArgs.data.map((item: any) => ({ ...item, tenantId: context.tenantId }));
          } else {
            castArgs.data = { ...castArgs.data, tenantId: context.tenantId };
          }
        }

        // Para update e delete, garantimos que o registro pertença ao tenant
        if (["update", "updateMany", "delete", "deleteMany", "upsert"].includes(operation)) {
          const castArgs = args as any;
          castArgs.where = { ...castArgs.where, tenantId: context.tenantId };
        }

        return query(args);
      },
    },
  },
});

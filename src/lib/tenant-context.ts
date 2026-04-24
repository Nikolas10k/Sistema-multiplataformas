import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  niche?: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export const tenantContext = {
  get: () => tenantStorage.getStore(),
  run: <T>(context: TenantContext, fn: () => T) => tenantStorage.run(context, fn),
};

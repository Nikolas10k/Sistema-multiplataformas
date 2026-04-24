import { prisma } from "./prisma";

// Cache em memória simples para as features do tenant (em prod, usar Redis)
const tenantFeaturesCache = new Map<string, { features: Set<string>, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minuto

/**
 * Busca todas as features habilitadas para um Tenant
 */
export async function getTenantFeatures(tenantId: string): Promise<Set<string>> {
  const now = Date.now();
  const cached = tenantFeaturesCache.get(tenantId);
  
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.features;
  }

  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId.length < 5) {
    return new Set();
  }

  // Busca plano e módulos do banco
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      modules: { where: { enabled: true } }
    }
  });

  if (!tenant) return new Set();

  const enabledFeatures = new Set<string>();

  // Adiciona módulos ativos como features
  tenant.modules.forEach(m => enabledFeatures.add(m.moduleKey));

  // Features implícitas pelo plano
  if (tenant.plan.code === 'pro') {
    enabledFeatures.add('reports.advanced');
  }
  if (tenant.plan.code === 'max') {
    enabledFeatures.add('reports.advanced');
    enabledFeatures.add('multiunit.enabled');
  }

  // Se for varejo ou fisioterapia, libera as features base se não estiverem nos módulos
  // (Isso é um fallback de segurança)
  const niche = await prisma.nicheType.findUnique({ where: { id: tenant.nicheId } });
  if (niche?.code === 'RETAIL') enabledFeatures.add('sales.basic');
  if (niche?.code === 'PHYSIOTHERAPY') enabledFeatures.add('patients.manage');

  // Atualiza cache
  tenantFeaturesCache.set(tenantId, { features: enabledFeatures, timestamp: now });

  return enabledFeatures;
}

/**
 * Verifica se um Tenant tem uma feature específica liberada
 */
export async function hasFeature(tenantId: string | null | undefined, featureCode: string): Promise<boolean> {
  if (!tenantId) return false;
  const features = await getTenantFeatures(tenantId);
  return features.has(featureCode);
}

/**
 * Verifica permissões granulares por role (RBAC básico)
 */
export function can(role: string, resource: string, action: string = 'manage'): boolean {
  if (role === 'PLATFORM_ADMIN') return true;
  if (role === 'ADMIN') return true;
  
  if (role === 'CASHIER') {
    if (resource === 'pdv') return true;
    if (resource === 'orders' && action === 'view') return true;
  }
  
  if (role === 'WAITER') {
    if (resource === 'comanda') return true;
  }
  
  return false;
}

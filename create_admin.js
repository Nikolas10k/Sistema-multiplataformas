const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- INICIANDO CONFIGURACAO COMPLETA SAAS ---')
  
  // 1. Criar Features do Sistema
  const featureDefinitions = [
    { code: 'dashboard.analytics', name: 'Dashboard Analitico' },
    { code: 'pdv.basic', name: 'PDV Digital' },
    { code: 'products.manage', name: 'Gestao de Produtos' },
    { code: 'employees.manage', name: 'Gestao de Equipe' },
    { code: 'multiunit.enabled', name: 'Multi-lojas (Redes)' },
    { code: 'inventory.basic', name: 'Controle de Estoque' },
    { code: 'reports.advanced', name: 'Relatorios Avancados' },
    { code: 'orders.comanda', name: 'Comandas Eletronicas' },
    { code: 'platform.tenants', name: 'Gestao de Clientes (SaaS)' }
  ]

  for (const f of featureDefinitions) {
    await prisma.feature.upsert({
      where: { code: f.code },
      update: { name: f.name },
      create: { code: f.code, name: f.name }
    })
  }
  console.log('Features cadastradas.')

  const features = await prisma.feature.findMany()
  const fMap = features.reduce((acc, f) => ({ ...acc, [f.code]: f.id }), {})

  // 2. Definir Planos
  const planDefinitions = [
    {
      code: 'START',
      name: 'Plano Start',
      price: 149.90,
      features: ['dashboard.analytics', 'pdv.basic', 'products.manage', 'employees.manage', 'orders.comanda']
    },
    {
      code: 'PRO',
      name: 'Plano Pro',
      price: 249.90,
      features: ['dashboard.analytics', 'pdv.basic', 'products.manage', 'employees.manage', 'inventory.basic', 'orders.comanda']
    },
    {
      code: 'PREMIUM',
      name: 'Plano Premium',
      price: 449.90,
      features: ['dashboard.analytics', 'pdv.basic', 'products.manage', 'employees.manage', 'inventory.basic', 'multiunit.enabled', 'reports.advanced', 'orders.comanda']
    }
  ]

  for (const pDef of planDefinitions) {
    const plan = await prisma.plan.upsert({
      where: { code: pDef.code },
      update: { priceMonthly: pDef.price, name: pDef.name },
      create: {
        code: pDef.code,
        name: pDef.name,
        priceMonthly: pDef.price
      }
    })

    // Atribuir features ao plano
    for (const fCode of pDef.features) {
      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId: plan.id, featureId: fMap[fCode] } },
        update: { enabled: true },
        create: { planId: plan.id, featureId: fMap[fCode], enabled: true }
      })
    }
  }
  console.log('Planos Start, Pro e Premium configurados.')

  // 3. Super Admin
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { role: 'PLATFORM_ADMIN' },
    create: {
      name: 'Super Admin',
      username: 'superadmin',
      password: '123',
      role: 'PLATFORM_ADMIN',
      tenantId: null
    }
  })
  console.log('Super Admin pronto.')

  // 4. Tenant de Exemplo (START)
  const startPlan = await prisma.plan.findUnique({ where: { code: 'START' } })
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: { planId: startPlan.id },
    create: {
      id: 'default-tenant',
      name: 'Restaurante Modelo (Start)',
      planId: startPlan.id
    }
  })

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { tenantId: tenant.id },
    create: {
      name: 'Admin Start',
      username: 'admin',
      password: '123',
      role: 'ADMIN',
      tenantId: tenant.id
    }
  })

  // 5. Garcom de Exemplo (PRO)
  const proPlan = await prisma.plan.findUnique({ where: { code: 'PRO' } })
  const tenantPro = await prisma.tenant.upsert({
    where: { id: 'tenant-pro' },
    update: { planId: proPlan.id },
    create: {
      id: 'tenant-pro',
      name: 'Restaurante Gourmet (Pro)',
      planId: proPlan.id
    }
  })

  await prisma.user.upsert({
    where: { username: 'garcom' },
    update: { tenantId: tenantPro.id, role: 'WAITER' },
    create: {
      name: 'Garcom Silva',
      username: 'garcom',
      password: '123',
      role: 'WAITER',
      tenantId: tenantPro.id
    }
  })

  console.log('Setup SaaS concluido com sucesso!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- EXPANDINDO DEMO SAAS ---')
  
  // Planos e Features já devem estar lá, mas vamos reforçar
  const plans = await prisma.plan.findMany()
  const pMap = plans.reduce((acc, p) => ({ ...acc, [p.code]: p.id }), {})

  // 1. Tenant Pro
  const tenantPro = await prisma.tenant.upsert({
    where: { id: 'tenant-pro' },
    update: { planId: pMap['PRO'] },
    create: {
      id: 'tenant-pro',
      name: 'Restaurante Gourmet (Pro)',
      planId: pMap['PRO']
    }
  })

  await prisma.user.upsert({
    where: { username: 'admin_pro' },
    update: { tenantId: tenantPro.id },
    create: {
      name: 'Gerente Pro',
      username: 'admin_pro',
      password: '123',
      role: 'ADMIN',
      tenantId: tenantPro.id
    }
  })

  // 2. Tenant Premium
  const tenantPremium = await prisma.tenant.upsert({
    where: { id: 'tenant-premium' },
    update: { planId: pMap['PREMIUM'] },
    create: {
      id: 'tenant-premium',
      name: 'Rede de Fast Food (Premium)',
      planId: pMap['PREMIUM']
    }
  })

  await prisma.user.upsert({
    where: { username: 'admin_premium' },
    update: { tenantId: tenantPremium.id },
    create: {
      name: 'Diretor Premium',
      username: 'admin_premium',
      password: '123',
      role: 'ADMIN',
      tenantId: tenantPremium.id
    }
  })

  console.log('Usuarios admin_pro e admin_premium criados.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Nichos
  const niches = [
    { code: 'RESTAURANT', name: 'Restaurante e Gastronomia' },
    { code: 'PHYSIOTHERAPY', name: 'Fisioterapia e Reabilitação' },
    { code: 'RETAIL', name: 'Varejo e Comércio' },
    { code: 'VETERINARY', name: 'Veterinária e Petshop' },
    { code: 'GENERAL', name: 'Geral / Outros' },
  ];

  for (const n of niches) {
    await prisma.nicheType.upsert({
      where: { code: n.code },
      update: { name: n.name },
      create: n,
    });
  }

  // 2. Planos
  const plans = [
    { code: 'start', name: 'Start', priceMonthly: 99 },
    { code: 'pro', name: 'Professional', priceMonthly: 199 },
    { code: 'max', name: 'Premium Max', priceMonthly: 399 },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: { name: p.name, priceMonthly: p.priceMonthly },
      create: p,
    });
  }

  // 3. Roles
  const roles = ['ADMIN', 'MANAGER', 'WAITER', 'PHYSIOTHERAPIST', 'RECEPTIONIST', 'VETERINARIAN'];
  const roleEntities = {};
  for (const r of roles) {
    roleEntities[r] = await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r },
    });
  }

  // 4. Super Admin
  await prisma.user.upsert({
    where: { username: 'master' },
    update: { password: 'master123', isPlatformAdmin: true },
    create: {
      name: 'Administrador Master',
      username: 'master',
      password: 'master123',
      isPlatformAdmin: true
    }
  });

  // 5. Tenant de Exemplo - Fisioterapia
  const physioNiche = await prisma.nicheType.findUnique({ where: { code: 'PHYSIOTHERAPY' } });
  const maxPlan = await prisma.plan.findUnique({ where: { code: 'max' } });

  const tenantPhysio = await prisma.tenant.upsert({
    where: { slug: 'clinica-viva' },
    update: {},
    create: {
      name: 'Clínica Viva Fisioterapia',
      slug: 'clinica-viva',
      nicheId: physioNiche.id,
      planId: maxPlan.id,
      config: {
        create: {
          companyName: 'Clínica Viva',
          primaryColor: '#059669', // Verde Esmeralda
        }
      },
      modules: {
        create: [
          { moduleKey: 'clinical_files' },
          { moduleKey: 'patients.manage' },
          { moduleKey: 'calendar.enabled' },
          { moduleKey: 'products.manage' },
          { moduleKey: 'inventory.basic' },
          { moduleKey: 'reports.advanced' },
          { moduleKey: 'employees.manage' }
        ]
      }
    }
  });

  // Usuário Fisio
  const userFisio = await prisma.user.upsert({
    where: { username: 'fisio' },
    update: { password: 'fisio123' },
    create: {
      name: 'Dr. Ricardo Oliveira',
      username: 'fisio',
      password: 'fisio123',
    }
  });

  await prisma.userTenantRole.upsert({
    where: { userId_tenantId: { userId: userFisio.id, tenantId: tenantPhysio.id } },
    update: { roleId: roleEntities['PHYSIOTHERAPIST'].id },
    create: {
      userId: userFisio.id,
      tenantId: tenantPhysio.id,
      roleId: roleEntities['PHYSIOTHERAPIST'].id
    }
  });

  // 6. Tenant de Exemplo - VAREJO
  const retailNiche = await prisma.nicheType.findUnique({ where: { code: 'RETAIL' } });
  const startPlan = await prisma.plan.findUnique({ where: { code: 'start' } });

  const tenantRetail = await prisma.tenant.upsert({
    where: { slug: 'loja-tech' },
    update: {},
    create: {
      name: 'Loja Tech Acessórios',
      slug: 'loja-tech',
      nicheId: retailNiche.id,
      planId: startPlan.id,
      config: {
        create: {
          companyName: 'Loja Tech',
          primaryColor: '#1d4ed8', // Azul Royal
        }
      },
      modules: {
        create: [
          { moduleKey: 'sales.basic' },
          { moduleKey: 'inventory.basic' },
          { moduleKey: 'customers.manage' },
          { moduleKey: 'products.manage' },
          { moduleKey: 'reports.advanced' },
          { moduleKey: 'employees.manage' }
        ]
      }
    }
  });

  const userRetail = await prisma.user.upsert({
    where: { username: 'loja' },
    update: { password: 'loja123' },
    create: {
      name: 'Gerente Carlos',
      username: 'loja',
      password: 'loja123',
    }
  });

  await prisma.userTenantRole.upsert({
    where: { userId_tenantId: { userId: userRetail.id, tenantId: tenantRetail.id } },
    update: { roleId: roleEntities['MANAGER'].id },
    create: {
      userId: userRetail.id,
      tenantId: tenantRetail.id,
      roleId: roleEntities['MANAGER'].id
    }
  });

  // 7. Tenant de Exemplo - RESTAURANTE
  const restNiche = await prisma.nicheType.findUnique({ where: { code: 'RESTAURANT' } });
  const proPlan = await prisma.plan.findUnique({ where: { code: 'pro' } });

  const tenantRest = await prisma.tenant.upsert({
    where: { slug: 'original' },
    update: {},
    create: {
      name: 'Givance Restaurante Original',
      slug: 'original',
      nicheId: restNiche.id,
      planId: proPlan.id,
      config: {
        create: {
          companyName: 'Restaurante Original',
          primaryColor: '#e11d48', // Rosa/Vermelho
        }
      },
      modules: {
        create: [
          { moduleKey: 'pdv.basic' },
          { moduleKey: 'billing.basic' },
          { moduleKey: 'products.manage' },
          { moduleKey: 'inventory.basic' },
          { moduleKey: 'reports.advanced' },
          { moduleKey: 'employees.manage' }
        ]
      }
    }
  });

  const userRest = await prisma.user.upsert({
    where: { username: 'rest' },
    update: { password: 'rest123' },
    create: {
      name: 'Chef Eduardo',
      username: 'rest',
      password: 'rest123',
    }
  });

  await prisma.userTenantRole.upsert({
    where: { userId_tenantId: { userId: userRest.id, tenantId: tenantRest.id } },
    update: { roleId: roleEntities['ADMIN'].id },
    create: {
      userId: userRest.id,
      tenantId: tenantRest.id,
      roleId: roleEntities['ADMIN'].id
    }
  });

  console.log('Seed completo!');
  console.log('Super Admin: master / master123');
  console.log('Fisioterapeuta: fisio / fisio123 (Tenant: Clínica Viva)');
  console.log('Varejo: loja / loja123 (Tenant: Loja Tech)');
  console.log('Restaurante: rest / rest123 (Tenant: Original)');

  // 8. Tenant Priscila Lanches (PLANO START)
  const priscilaTenant = await prisma.tenant.upsert({
    where: { slug: 'priscilalanches' },
    update: {},
    create: {
      name: 'Priscila Lanches Gourmet',
      slug: 'priscilalanches',
      nicheId: restNiche.id,
      planId: startPlan.id,
      config: {
        create: {
          companyName: 'Priscila Lanches',
          primaryColor: '#f59e0b', // Laranja
        }
      },
      modules: {
        create: [
          { moduleKey: 'pdv.basic' },
          { moduleKey: 'billing.basic' },
          { moduleKey: 'products.manage' }
        ]
      }
    }
  });

  const userPriscila = await prisma.user.upsert({
    where: { username: 'Priscila' },
    update: { password: '123' },
    create: {
      name: 'Priscila',
      username: 'Priscila',
      password: '123',
    }
  });

  await prisma.userTenantRole.upsert({
    where: { userId_tenantId: { userId: userPriscila.id, tenantId: priscilaTenant.id } },
    update: { roleId: roleEntities['ADMIN'].id },
    create: {
      userId: userPriscila.id,
      tenantId: priscilaTenant.id,
      roleId: roleEntities['ADMIN'].id
    }
  });

  console.log('Restaurante Start: Priscila / 123 (Tenant: priscilalanches)');

  // 9. Tenant de Exemplo - VETERINARIA
  const vetNiche = await prisma.nicheType.findUnique({ where: { code: 'VETERINARY' } });
  
  const tenantVet = await prisma.tenant.upsert({
    where: { slug: 'vet-care' },
    update: {},
    create: {
      name: 'VetCare Clínica Veterinária',
      slug: 'vet-care',
      nicheId: vetNiche.id,
      planId: maxPlan.id,
      config: {
        create: {
          companyName: 'VetCare',
          primaryColor: '#8b5cf6', // Violeta
        }
      },
      modules: {
        create: [
          { moduleKey: 'tutores.manage' },
          { moduleKey: 'animals.manage' },
          { moduleKey: 'calendar.enabled' },
          { moduleKey: 'vet_clinical_files' },
          { moduleKey: 'vaccines.enabled' },
          { moduleKey: 'exams.enabled' },
          { moduleKey: 'internment.enabled' },
          { moduleKey: 'products.manage' },
          { moduleKey: 'inventory.basic' },
          { moduleKey: 'reports.advanced' },
          { moduleKey: 'employees.manage' }
        ]
      }
    }
  });

  const userVet = await prisma.user.upsert({
    where: { username: 'vet' },
    update: { password: 'vet123' },
    create: {
      name: 'Dra. Luana Sampaio',
      username: 'vet',
      password: 'vet123',
    }
  });

  await prisma.userTenantRole.upsert({
    where: { userId_tenantId: { userId: userVet.id, tenantId: tenantVet.id } },
    update: { roleId: roleEntities['ADMIN'].id },
    create: {
      userId: userVet.id,
      tenantId: tenantVet.id,
      roleId: roleEntities['ADMIN'].id
    }
  });

  console.log('Veterinária: vet / vet123 (Tenant: vet-care)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

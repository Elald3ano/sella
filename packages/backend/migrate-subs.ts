import { PrismaClient } from '@prisma/client';

async function migrate() {
  const p = new PrismaClient();
  const businesses = await p.business.findMany({
    where: { subscription: null },
  });

  console.log(`Negocios sin subscription: ${businesses.length}`);

  for (const b of businesses) {
    const trialEndsAt = new Date(b.createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    await p.subscription.create({
      data: {
        businessId: b.id,
        plan: b.plan || 'trial',
        trialEndsAt,
        startedAt: b.createdAt,
      },
    });

    if (b.plan === 'free') {
      await p.business.update({ where: { id: b.id }, data: { plan: 'trial' } });
    }

    console.log(`  ✅ ${b.name} → subscription creada`);
  }

  console.log('Migración completada.');
  await p.$disconnect();
}

migrate().catch(console.error);

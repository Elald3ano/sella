import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function seed() {
  const p = new PrismaClient();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'sella2026';

  const existing = await p.adminUser.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin "${username}" ya existe.`);
    await p.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await p.adminUser.create({ data: { username, passwordHash } });
  console.log(`Admin "${username}" creado.`);
  await p.$disconnect();
}

seed().catch(console.error);

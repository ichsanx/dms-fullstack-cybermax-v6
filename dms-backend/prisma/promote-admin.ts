/* eslint-env node */
import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// paksa load .env dari root dms-backend (bukan dari env Windows)
config({ path: path.join(__dirname, '..', '.env'), override: true });

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || 'user6@mail.com').trim().toLowerCase();

  // cek dulu ada/tidak
  const found = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!found) {
    // bantu debug: tampilkan user yang mengandung "user6"
    const candidates = await prisma.user.findMany({
      where: { email: { contains: 'user6' } },
      select: { id: true, email: true, role: true },
      take: 20,
    });

    console.log('❌ User tidak ketemu:', email);
    console.log('🔎 Kandidat email mengandung "user6":', candidates);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
    select: { id: true, email: true, role: true },
  });

  console.log('✅ Updated:', updated);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.join(__dirname, '..', '.env'), override: true });

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  console.log('TOTAL USERS =', users.length);
  console.table(users);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());

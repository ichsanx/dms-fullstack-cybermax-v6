import * as path from 'path';
import * as dotenv from 'dotenv';

// paksa load .env dari root project (dms-backend/.env)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Pastikan file .env ada di root dms-backend dan berisi DATABASE_URL=');
}

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@mail.com';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log('Admin already exists:', email);
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: { email, password: passwordHash, role: Role.ADMIN },
  });

  console.log('Seeded admin:', email, 'password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

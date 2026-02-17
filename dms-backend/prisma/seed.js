"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const dotenv = require("dotenv");
// paksa load .env dari root project (dms-backend/.env)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Pastikan file .env ada di root dms-backend dan berisi DATABASE_URL=');
}
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'admin@mail.com';
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        console.log('Admin already exists:', email);
        return;
    }
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
        data: { email, password: passwordHash, role: client_1.Role.ADMIN },
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

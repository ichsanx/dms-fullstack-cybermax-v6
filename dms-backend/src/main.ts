import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { PrismaService } from './prisma/prisma.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

function parseCorsOrigins() {
  // support: CORS_ORIGIN="http://localhost:3001,http://localhost:3000"
  const raw = process.env.CORS_ORIGIN?.trim();

  const defaults = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const origins = (raw ? raw.split(',') : defaults)
    .map((s) => s.trim())
    .filter(Boolean);

  return new Set(origins);
}

async function bootstrap() {
  // ✅ Load env PASTI dari file .env di root dms-backend (works for src & dist)
  dotenv.config({
    path: join(__dirname, '..', '.env'),
    override: true,
  });

  // ✅ Log masked DATABASE_URL (untuk debug aman)
  const db = process.env.DATABASE_URL || '';
  const masked = db.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  console.log('BACKEND CWD =', process.cwd());
  console.log('BACKEND ENV FILE =', join(__dirname, '..', '.env'));
  console.log('BACKEND DATABASE_URL =', masked);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ CORS dari env (fallback ke localhost)
  const allowedOrigins = parseCorsOrigins();
  console.log('BACKEND CORS_ORIGIN =', [...allowedOrigins]);

  app.enableCors({
    origin: (origin, cb) => {
      // allow server-to-server / curl / postman (origin undefined)
      if (!origin) return cb(null, true);

      if (allowedOrigins.has(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ✅ Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // ✅ Ensure uploads folder exists (di root project yang jalan)
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  /**
   * ✅ IMPORTANT:
   * Jangan serve static /uploads untuk keamanan.
   * Download harus lewat endpoint JWT: GET /documents/:id/download
   */
  // app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // ✅ Swagger: http://localhost:<port>/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DMS API')
    .setDescription('Document Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ✅ Prisma shutdown hooks (Prisma v6)
  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);

  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs:  http://localhost:${port}/docs`);
  console.log(`⬇️  Download via:  http://localhost:${port}/documents/<id>/download`);
}

bootstrap();
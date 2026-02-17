import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { PrismaService } from './prisma/prisma.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
// Load env PASTI dari file .env di root dms-backend
  dotenv.config({
    path: join(__dirname, '..', '.env'), // aman untuk src dan dist
    override: true,
  });

  const db = process.env.DATABASE_URL || '';
  const masked = db.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  console.log('BACKEND CWD =', process.cwd());
  console.log('BACKEND ENV FILE =', join(__dirname, '..', '.env'));
  console.log('BACKEND DATABASE_URL =', masked);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // (Opsional tapi bagus) Enable CORS untuk kebutuhan frontend / Swagger
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Pastikan folder uploads ada
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  // Serve static uploads
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Swagger setup: http://localhost:3000/docs
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
    swaggerOptions: {
      persistAuthorization: true, // biar token tidak hilang saat refresh
    },
  });

  // Prisma shutdown hooks (Prisma v6)
  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);

  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs:  http://localhost:${port}/docs`);
  console.log(`📁 Uploads:       http://localhost:${port}/uploads/<filename>`);
}

bootstrap();

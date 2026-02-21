import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ✅ Global throttler dibuat longgar supaya tidak ganggu endpoint lain
    // ✅ Login sudah di-throttle ketat di AuthController dengan @Throttle({ default: { ttl, limit } })
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 180,    // 3 menit
        limit: 1000, // longgar (global)
      },
    ]),

    PrismaModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    ApprovalsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
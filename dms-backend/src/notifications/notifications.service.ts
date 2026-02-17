import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async my(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) return null;

    if (notif.userId !== userId) {
      throw new ForbiddenException('Not your notification');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}

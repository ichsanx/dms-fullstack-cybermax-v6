import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { email: string; password: string; role?: Role }) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');
    if (!dto.password) throw new BadRequestException('Password is required');

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) throw new BadRequestException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: dto.role ?? Role.USER,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return { user };
  }
}
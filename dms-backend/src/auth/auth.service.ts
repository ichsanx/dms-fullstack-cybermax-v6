import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

type SafeUser = {
  id: string;
  email: string;
  role: any;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private toSafeUser(user: any): SafeUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private signToken(user: { id: string; email: string; role: any }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async register(dto: RegisterDto) {
    const email = dto.email?.trim().toLowerCase();

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
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const accessToken = this.signToken(user);

    // ✅ token alias biar FE gak rewel beda nama field
    return {
      user,
      accessToken,
      access_token: accessToken,
      token: accessToken,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, createdAt: true, password: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const safeUser = this.toSafeUser(user);
    const accessToken = this.signToken(user);

    return {
      user: safeUser,
      accessToken,
      access_token: accessToken,
      token: accessToken,
    };
  }
}

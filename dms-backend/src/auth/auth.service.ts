import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
// Optional: kalau Prisma kamu punya enum Role, ini akan lebih strict.
// Kalau error karena Role tidak ada, hapus import ini dan ganti Role menjadi `any`.
import { Role } from '@prisma/client';

type SafeUser = {
  id: string;
  email: string;
  role: Role | any;
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

  private signToken(user: { id: string; email: string; role: Role | any }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * ❌ Register publik DIHAPUS
   * Sesuai requirement: user dibuat oleh ADMIN via endpoint /users (admin-only) atau lewat seed.
   *
   * Kalau ada code lain yang masih memanggil auth.register(), hapus/ubah jadi create-user by admin.
   */

  async login(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        password: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const safeUser = this.toSafeUser(user);
    const accessToken = this.signToken(user);

    // ✅ token alias biar FE gak rewel beda nama field
    return {
      user: safeUser,
      accessToken,
      access_token: accessToken,
      token: accessToken,
    };
  }
}
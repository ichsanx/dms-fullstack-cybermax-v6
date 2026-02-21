import {
  Body,
  Controller,
  Get,
  HttpCode,
  Options,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Options('*')
  @HttpCode(204)
  options(@Res() res: Response) {
    return res.send();
  }

  // ✅ Rate limit login: 10 request / 3 menit per IP
  @Post('login')
  @Throttle({ default: { ttl: 180, limit: 10 } })
  @ApiOperation({ summary: 'Login and get access token' })
  @ApiBody({ type: LoginDto })
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiOperation({ summary: 'Get current user (JWT payload)' })
  @ApiBearerAuth('access-token')
  me(@Req() req: any) {
    return req.user;
  }
}
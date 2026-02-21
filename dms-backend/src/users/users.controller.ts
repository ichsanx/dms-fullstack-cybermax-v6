import { Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

class CreateUserDto {
  email: string;
  password: string;
  role?: Role; // optional, default USER
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'ADMIN only: create new user' })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    if (req.user?.role !== Role.ADMIN) {
      throw new ForbiddenException('ADMIN only');
    }
    return this.users.create(dto);
  }
}
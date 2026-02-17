import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notif: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  async list(@Req() req: any) {
    return this.notif.my(req.user.sub);
  }

  @Get('me')
  @ApiOperation({ summary: 'List my notifications (alias)' })
  async me(@Req() req: any) {
    return this.notif.my(req.user.sub);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async read(@Req() req: any, @Param('id') id: string) {
    return this.notif.markRead(req.user.sub, id);
  }
}

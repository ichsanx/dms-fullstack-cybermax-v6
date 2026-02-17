import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApprovalsService } from './approvals.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Approvals')
@ApiBearerAuth('access-token')
@Controller('approvals')
@UseGuards(AuthGuard('jwt'))
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  // GET /approvals/requests (admin only - dicek di service)
  @Get('requests')
  @ApiOperation({ summary: 'List pending approval requests (Admin only)' })
  async listPending(@Req() req: any) {
    return this.approvals.listPending(req.user);
  }

  // POST /approvals/requests/:id/approve
  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve request (DELETE/REPLACE) (Admin only)' })
  @ApiParam({ name: 'id', description: 'PermissionRequest ID' })
  async approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() _body?: any, // body optional, backward compatibility
  ) {
    return this.approvals.approve(req.user, id);
  }

  // POST /approvals/requests/:id/reject
  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject request (DELETE/REPLACE) (Admin only)' })
  @ApiParam({ name: 'id', description: 'PermissionRequest ID' })
  async reject(@Req() req: any, @Param('id') id: string) {
    return this.approvals.reject(req.user, id);
  }
}

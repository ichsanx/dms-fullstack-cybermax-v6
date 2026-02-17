import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DocumentStatus,
  PermissionType,
  RequestStatus,
  Role,
} from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async listPending(user: any) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Admin only');

    return this.prisma.permissionRequest.findMany({
      where: { status: RequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: {
        document: true,
        requestedBy: { select: { id: true, email: true, role: true } },
      },
    });
  }

  /**
   * Approve:
   * - DELETE: hapus Document (cascade akan hapus PermissionRequest terkait)
   * - REPLACE: ambil replaceFileUrl dari PermissionRequest lalu update Document
   */
  async approve(user: any, requestId: string) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Admin only');

    const req = await this.prisma.permissionRequest.findUnique({
      where: { id: requestId },
      include: { document: true, requestedBy: true },
    });

    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== RequestStatus.PENDING) {
      return { ok: false, message: 'Request already processed' };
    }
    if (!req.document) throw new NotFoundException('Document not found');

    // ✅ VALIDASI STATUS DOKUMEN (wajib supaya tidak approve request "nyasar")
    if (
      req.type === PermissionType.DELETE &&
      req.document.status !== DocumentStatus.PENDING_DELETE
    ) {
      throw new BadRequestException(
        `Document status invalid for DELETE approval: ${req.document.status}`,
      );
    }
    if (
      req.type === PermissionType.REPLACE &&
      req.document.status !== DocumentStatus.PENDING_REPLACE
    ) {
      throw new BadRequestException(
        `Document status invalid for REPLACE approval: ${req.document.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // ====== APPROVE: DELETE ======
      if (req.type === PermissionType.DELETE) {
        await tx.notification.create({
          data: {
            userId: req.requestedById,
            message: `Your request DELETE for document "${req.document.title}" has been APPROVED`,
          },
        });

        await tx.permissionRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.APPROVED },
        });

        await tx.document.delete({ where: { id: req.documentId } });

        return { ok: true, message: 'Delete approved & document deleted' };
      }

      // ====== APPROVE: REPLACE ======
      if (req.type === PermissionType.REPLACE) {
        const newFileUrl = req.replaceFileUrl;

        if (!newFileUrl) {
          // jangan biarkan doc nyangkut di PENDING_REPLACE
          await tx.document.update({
            where: { id: req.documentId },
            data: { status: DocumentStatus.ACTIVE },
          });

          throw new BadRequestException(
            'replaceFileUrl is missing on PermissionRequest (requestReplace harus menyimpan replaceFileUrl)',
          );
        }

        await tx.document.update({
          where: { id: req.documentId },
          data: {
            fileUrl: newFileUrl,
            version: { increment: 1 },
            status: DocumentStatus.ACTIVE,
          },
        });

        await tx.permissionRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.APPROVED, replaceFileUrl: null },
        });

        await tx.notification.create({
          data: {
            userId: req.requestedById,
            message: `Your request REPLACE for document "${req.document.title}" has been APPROVED`,
          },
        });

        return { ok: true, message: 'Replace approved & document updated' };
      }

      // fallback
      await tx.permissionRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.APPROVED },
      });

      await tx.notification.create({
        data: {
          userId: req.requestedById,
          message: `Your request ${req.type} for document "${req.document.title}" has been APPROVED`,
        },
      });

      return { ok: true, message: 'Approved' };
    });
  }

  async reject(user: any, requestId: string) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Admin only');

    const req = await this.prisma.permissionRequest.findUnique({
      where: { id: requestId },
      include: { document: true },
    });

    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== RequestStatus.PENDING) {
      return { ok: false, message: 'Request already processed' };
    }
    if (!req.document) throw new NotFoundException('Document not found');

    // ✅ VALIDASI STATUS DOKUMEN juga saat reject (biar konsisten)
    if (
      req.type === PermissionType.DELETE &&
      req.document.status !== DocumentStatus.PENDING_DELETE
    ) {
      throw new BadRequestException(
        `Document status invalid for DELETE rejection: ${req.document.status}`,
      );
    }
    if (
      req.type === PermissionType.REPLACE &&
      req.document.status !== DocumentStatus.PENDING_REPLACE
    ) {
      throw new BadRequestException(
        `Document status invalid for REPLACE rejection: ${req.document.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // balikkan status dokumen biar tidak nyangkut
      await tx.document.update({
        where: { id: req.documentId },
        data: { status: DocumentStatus.ACTIVE },
      });

      await tx.permissionRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.REJECTED, replaceFileUrl: null },
      });

      await tx.notification.create({
        data: {
          userId: req.requestedById,
          message: `Your request ${req.type} for document "${req.document.title}" has been REJECTED`,
        },
      });

      return { ok: true, message: 'Rejected' };
    });
  }
}

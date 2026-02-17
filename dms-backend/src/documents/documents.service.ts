import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import {
  DocumentStatus,
  PermissionType,
  RequestStatus,
  Role,
} from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async list(
    user: any,
    params: { q?: string; page: number; limit: number },
  ) {
    const { q, page, limit } = params;

    const where: any = {};

    // ✅ USER hanya lihat dokumen sendiri, ADMIN bisa lihat semua
    if (user.role !== Role.ADMIN) {
      where.createdById = user.sub;
    }

    if (q && q.trim().length > 0) {
      const query = q.trim();
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { documentType: { contains: query, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, email: true, role: true } },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async getById(user: any, id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, email: true, role: true } },
        permissionRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!doc) throw new NotFoundException('Document not found');

    // ✅ USER hanya boleh akses miliknya
    if (user.role !== Role.ADMIN && doc.createdById !== user.sub) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return doc;
  }

  async create(userId: string, dto: CreateDocumentDto, fileUrl: string) {
    if (!dto.title || !dto.documentType) {
      throw new BadRequestException('title & documentType are required');
    }

    return this.prisma.document.create({
      data: {
        title: dto.title,
        description: dto.description,
        documentType: dto.documentType,
        fileUrl,
        createdById: userId,
      },
    });
  }

  /**
   * USER request delete → create PermissionRequest(PENDING) + set doc status PENDING_DELETE
   * ADMIN tidak request lewat sini (ADMIN approve lewat /approvals)
   */
  async requestDelete(user: any, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // hanya owner (USER) yang boleh request; admin juga boleh kalau mau, tapi requirement biasanya user
    if (user.role !== Role.ADMIN && doc.createdById !== user.sub) {
      throw new ForbiddenException('Only owner can request delete');
    }

    if (doc.status !== DocumentStatus.ACTIVE) {
      throw new BadRequestException(
        `Document is locked. Current status: ${doc.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // buat request
      const pr = await tx.permissionRequest.create({
        data: {
          type: PermissionType.DELETE,
          status: RequestStatus.PENDING,
          documentId,
          requestedById: user.sub,
        },
      });

      // lock document
      await tx.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PENDING_DELETE },
      });

      // notif semua admin
      const admins = await tx.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            message: `New DELETE request for document "${doc.title}"`,
          })),
        });
      }

      return {
        ok: true,
        message: 'Delete request created. Waiting for admin approval.',
        requestId: pr.id,
      };
    });
  }

  /**
   * USER request replace → simpan replaceFileUrl di PermissionRequest + lock doc PENDING_REPLACE
   */
  async requestReplace(
    user: any,
    documentId: string,
    replaceFileUrl: string,
    dto: Partial<CreateDocumentDto>,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    if (user.role !== Role.ADMIN && doc.createdById !== user.sub) {
      throw new ForbiddenException('Only owner can request replace');
    }

    if (doc.status !== DocumentStatus.ACTIVE) {
      throw new BadRequestException(
        `Document is locked. Current status: ${doc.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const pr = await tx.permissionRequest.create({
        data: {
          type: PermissionType.REPLACE,
          status: RequestStatus.PENDING,
          documentId,
          requestedById: user.sub,
          replaceFileUrl,
        },
      });

      // lock + (optional) update metadata sekarang
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.PENDING_REPLACE,
          ...(dto?.title ? { title: dto.title } : {}),
          ...(dto?.description !== undefined ? { description: dto.description } : {}),
          ...(dto?.documentType ? { documentType: dto.documentType } : {}),
        },
      });

      // notif semua admin
      const admins = await tx.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            message: `New REPLACE request for document "${doc.title}"`,
          })),
        });
      }

      return {
        ok: true,
        message: 'Replace request created. Waiting for admin approval.',
        requestId: pr.id,
        replaceFileUrl,
      };
    });
  }
}

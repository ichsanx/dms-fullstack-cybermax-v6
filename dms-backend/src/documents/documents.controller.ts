import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

function fileName(req: any, file: any, cb: any) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, unique + extname(file.originalname));
}

function sanitizeFilename(name: string) {
  // replace karakter yang umum bikin masalah di file system / header
  return name
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, '-') // windows reserved
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  // LIST + SEARCH + PAGINATION
  @Get()
  @ApiOperation({ summary: 'List documents (search + pagination)' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query (title/description/type)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async list(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.docs.list(req.user, {
      q,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
  }

  // GET BY ID
  @Get(':id')
  @ApiOperation({ summary: 'Get document by id' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async get(@Req() req: any, @Param('id') id: string) {
    return this.docs.getById(req.user, id);
  }

  // ✅ SECURE DOWNLOAD (JWT required)
  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file (secure, JWT required)' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async download(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // akses kontrol tetap lewat service (ADMIN boleh semua, USER hanya miliknya)
    const doc: any = await this.docs.getById(req.user, id);

    // doc.fileUrl format: "/uploads/filename.ext"
    const storedFilename = path.basename(doc.fileUrl);
    const fullPath = path.join(process.cwd(), 'uploads', storedFilename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // bikin nama file yang enak: "<title>_v<version>.<ext>"
    const ext = path.extname(storedFilename) || '';
    const safeTitle = sanitizeFilename(doc.title || 'document');
    const downloadName = `${safeTitle}_v${doc.version}${ext}`;

    return res.download(fullPath, downloadName);
  }

  // UPLOAD + CREATE DOCUMENT
  @Post()
  @ApiOperation({ summary: 'Create document (upload file)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Doc Baru' },
        description: { type: 'string', example: 'testing upload' },
        documentType: { type: 'string', example: 'GENERAL' },
      },
      required: ['file', 'title', 'documentType'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: fileName,
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async create(
    @Req() req: any,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const fileUrl = `/uploads/${file.filename}`;
    return this.docs.create(req.user.sub, dto, fileUrl);
  }

  // ✅ REQUEST DELETE (bukan delete langsung)
  @Post(':id/request-delete')
  @ApiOperation({
    summary: 'Request delete document (USER creates request, ADMIN approves)',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async requestDelete(@Req() req: any, @Param('id') id: string) {
    return this.docs.requestDelete(req.user, id);
  }

  // ✅ REQUEST REPLACE (upload file baru, menunggu approval)
  @Post(':id/request-replace')
  @ApiOperation({
    summary: 'Request replace document file (USER creates request, ADMIN approves)',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Judul baru (optional)' },
        description: { type: 'string', example: 'Deskripsi baru (optional)' },
        documentType: { type: 'string', example: 'GENERAL' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: fileName,
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async requestReplace(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body() dto?: Partial<CreateDocumentDto>,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const fileUrl = `/uploads/${file.filename}`;
    return this.docs.requestReplace(req.user, id, fileUrl, dto ?? {});
  }
}
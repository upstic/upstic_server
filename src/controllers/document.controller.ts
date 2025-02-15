import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { DocumentService } from '../services/document.service';
import { AuthGuard } from '../guards/auth.guard';
import { JwtPayload } from '../types/auth.types';
import { Request } from 'express';

interface AuthRequest extends Omit<Request, 'user'> {
  user: JwtPayload;
}

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  async uploadDocument(@Req() req: AuthRequest, @Body() documentData: any) {
    const userId = req.user.id;
    return await DocumentService.uploadDocument(documentData, userId, documentData.file, documentData.metadata);
  }

  @Get()
  async getAllDocuments(@Req() req: AuthRequest) {
    const userId = req.user.id;
    return await DocumentService.getAllDocuments(userId);
  }

  @Get(':id')
  async getDocument(@Req() req: AuthRequest, @Param('id') documentId: string) {
    const userId = req.user.id;
    return await DocumentService.getDocument(documentId, userId);
  }

  @Put(':id')
  async updateDocument(
    @Req() req: AuthRequest,
    @Param('id') documentId: string,
    @Body() updateData: any
  ) {
    const userId = req.user.id;
    return await DocumentService.updateDocument(documentId, updateData, userId);
  }

  @Delete(':id')
  async deleteDocument(@Req() req: AuthRequest, @Param('id') documentId: string) {
    const userId = req.user.id;
    return await DocumentService.deleteDocument(documentId, userId);
  }

  @Post(':id/share')
  async shareDocument(
    @Req() req: AuthRequest,
    @Param('id') documentId: string,
    @Body() shareData: { recipientId: string; permissions: string[] }
  ) {
    const userId = req.user.id;
    return await DocumentService.shareDocument(documentId, shareData.recipientId, shareData.permissions, userId);
  }

  @Delete(':id/access/:recipientId')
  async revokeAccess(
    @Req() req: AuthRequest,
    @Param('id') documentId: string,
    @Param('recipientId') recipientId: string
  ) {
    const userId = req.user.id;
    return await DocumentService.revokeAccess(documentId, recipientId, userId);
  }

  @Get(':id/versions')
  async getVersions(@Req() req: AuthRequest, @Param('id') documentId: string) {
    const userId = req.user.id;
    return await DocumentService.getDocumentVersions(documentId, userId);
  }

  @Get(':id/access-log')
  async getAccessLog(@Req() req: AuthRequest, @Param('id') documentId: string) {
    const userId = req.user.id;
    return await DocumentService.getDocumentAccessLog(documentId, userId);
  }

  @Post(':id/verify')
  async verifyDocument(
    @Req() req: AuthRequest,
    @Param('id') documentId: string,
    @Body() verificationData: any
  ) {
    const userId = req.user.id;
    return await DocumentService.verifyDocument(documentId, userId, verificationData);
  }
} 
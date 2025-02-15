import { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class MessageController {
  static async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const message = await MessageService.sendMessage(
        req.user!.id,
        {
          recipientId: req.body.recipientId,
          content: req.body.content,
          type: req.body.type,
          metadata: req.body.metadata
        }
      );

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  static async getConversations(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        status: req.query.status as string,
        archived: req.query.archived === 'true',
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const conversations = await MessageService.getConversations(
        req.user!.id,
        filters
      );

      res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (error) {
      next(error);
    }
  }

  static async getConversationMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        type: req.query.type as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const messages = await MessageService.getConversationMessages(
        req.params.conversationId,
        req.user!.id,
        filters
      );

      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      next(error);
    }
  }

  static async markConversationAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await MessageService.markConversationAsRead(
        req.params.conversationId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendAttachment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      const message = await MessageService.sendAttachment(
        req.user!.id,
        {
          recipientId: req.body.recipientId,
          file: req.file,
          type: req.body.type,
          metadata: req.body.metadata
        }
      );

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await MessageService.deleteMessage(
        req.params.messageId,
        req.user!.id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const count = await MessageService.getUnreadCount(req.user!.id);

      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        query: req.query.q as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        type: req.query.type as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const messages = await MessageService.searchMessages(
        req.user!.id,
        filters
      );

      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      next(error);
    }
  }

  static async archiveConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await MessageService.archiveConversation(
        req.params.conversationId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        message: 'Conversation archived'
      });
    } catch (error) {
      next(error);
    }
  }

  static async unarchiveConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await MessageService.unarchiveConversation(
        req.params.conversationId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        message: 'Conversation unarchived'
      });
    } catch (error) {
      next(error);
    }
  }
} 
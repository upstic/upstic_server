import { User } from '../models/User';
import { sendEmail } from '../utils/email';
import { pushNotificationService } from './push-notification.service';
import { redisService } from './redis.service';
import { AppError } from '../middleware/errorHandler';
import { Template } from '../models/Template';
import { Message, MessageType, MessagePriority, MessageStatus, IMessage } from '../models/Message';
import { Client } from '../models/Client';
import { WebSocketService } from './websocket.service';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../utils/s3';
import { sanitizeHtml } from '../utils/sanitizer';
import { Queue } from 'bullmq';
import { logger } from '../utils/logger';

export enum CommunicationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

interface Message {
  from: string;
  to: string[];
  subject: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

interface ICommunicationTemplate {
  name: string;
  subject: string;
  content: string;
  type: CommunicationType;
  variables: string[];
}

export class CommunicationService {
  private static messageQueue: Queue;
  private static readonly MAX_RECIPIENTS = 100;
  private static readonly MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_ATTACHMENT_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain'
  ];

  static initialize() {
    this.messageQueue = new Queue('messages', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
  }

  static async sendMessage(
    senderId: string,
    messageData: {
      type: MessageType;
      recipientIds: string[];
      subject?: string;
      content: string;
      priority?: MessagePriority;
      attachments?: Express.Multer.File[];
      metadata?: Partial<IMessage['metadata']>;
    }
  ): Promise<IMessage> {
    const sender = await User.findById(senderId);
    if (!sender) {
      throw new AppError(404, 'Sender not found');
    }

    // Validate recipients
    if (messageData.recipientIds.length > this.MAX_RECIPIENTS) {
      throw new AppError(400, `Cannot send to more than ${this.MAX_RECIPIENTS} recipients`);
    }

    const recipients = await User.find({
      _id: { $in: messageData.recipientIds }
    });

    if (recipients.length !== messageData.recipientIds.length) {
      throw new AppError(400, 'One or more recipients not found');
    }

    // Process attachments if any
    const attachments = await this.processAttachments(messageData.attachments || []);

    // Sanitize content
    const sanitizedContent = sanitizeHtml(messageData.content);

    const message = new Message({
      type: messageData.type,
      senderId,
      recipients: recipients.map(recipient => ({
        userId: recipient._id,
        status: MessageStatus.SENT
      })),
      subject: messageData.subject,
      content: sanitizedContent,
      priority: messageData.priority || MessagePriority.NORMAL,
      attachments,
      metadata: {
        ...messageData.metadata,
        createdAt: new Date()
      }
    });

    await message.save();

    // Queue message delivery
    await this.queueMessageDelivery(message);

    return message;
  }

  static async sendAnnouncement(
    senderId: string,
    announcementData: {
      subject: string;
      content: string;
      priority: MessagePriority;
      clientId?: string;
      branchId?: string;
      tags?: string[];
      expiresAt?: Date;
    }
  ): Promise<IMessage> {
    // Find recipients based on filters
    const query: any = {};
    if (announcementData.clientId) {
      query.clientId = announcementData.clientId;
    }
    if (announcementData.branchId) {
      query.branchId = announcementData.branchId;
    }

    const recipients = await User.find(query);
    if (!recipients.length) {
      throw new AppError(400, 'No recipients found for announcement');
    }

    return this.sendMessage(senderId, {
      type: MessageType.ANNOUNCEMENT,
      recipientIds: recipients.map(r => r._id.toString()),
      ...announcementData,
      metadata: {
        clientId: announcementData.clientId,
        branchId: announcementData.branchId,
        tags: announcementData.tags,
        expiresAt: announcementData.expiresAt
      }
    });
  }

  static async markAsRead(
    userId: string,
    messageId: string
  ): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError(404, 'Message not found');
    }

    const recipient = message.recipients.find(r => r.userId === userId);
    if (!recipient) {
      throw new AppError(403, 'Not a recipient of this message');
    }

    recipient.status = MessageStatus.READ;
    recipient.readAt = new Date();

    await message.save();
  }

  static async getMessages(
    userId: string,
    options: {
      type?: MessageType[];
      status?: MessageStatus[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<IMessage[]> {
    const query: any = {
      'recipients.userId': userId
    };

    if (options.type?.length) {
      query.type = { $in: options.type };
    }

    if (options.status?.length) {
      query['recipients.status'] = { $in: options.status };
    }

    if (options.startDate || options.endDate) {
      query['metadata.createdAt'] = {};
      if (options.startDate) {
        query['metadata.createdAt'].$gte = options.startDate;
      }
      if (options.endDate) {
        query['metadata.createdAt'].$lte = options.endDate;
      }
    }

    return Message.find(query)
      .sort({ 'metadata.createdAt': -1 })
      .skip(options.offset || 0)
      .limit(options.limit || 50);
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return Message.countDocuments({
      'recipients.userId': userId,
      'recipients.status': { $ne: MessageStatus.READ }
    });
  }

  private static async processAttachments(
    files: Express.Multer.File[]
  ): Promise<IMessage['attachments']> {
    const attachments: IMessage['attachments'] = [];

    for (const file of files) {
      // Validate file type
      if (!this.ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
        throw new AppError(400, `Invalid file type: ${file.mimetype}`);
      }

      // Validate file size
      if (file.size > this.MAX_ATTACHMENT_SIZE) {
        throw new AppError(400, 'File size exceeds limit');
      }

      // Upload to S3
      const fileKey = `attachments/${Date.now()}-${file.originalname}`;
      const fileUrl = await uploadToS3(fileKey, file.buffer, file.mimetype);

      attachments.push({
        name: file.originalname,
        fileUrl,
        fileKey,
        fileType: file.mimetype,
        fileSize: file.size
      });
    }

    return attachments;
  }

  private static async queueMessageDelivery(message: IMessage): Promise<void> {
    await this.messageQueue.add('deliver', {
      messageId: message._id,
      recipients: message.recipients
    });
  }

  static async processMessageQueue(): Promise<void> {
    this.messageQueue.process('deliver', async job => {
      const { messageId, recipients } = job.data;
      const message = await Message.findById(messageId);
      
      if (!message) return;

      try {
        // Attempt real-time delivery via WebSocket
        for (const recipient of recipients) {
          try {
            await WebSocketService.sendToUser(recipient.userId, 'message', {
              messageId: message._id,
              type: message.type,
              subject: message.subject,
              content: message.content,
              priority: message.priority,
              metadata: message.metadata
            });

            // Update delivery status
            const recipientDoc = message.recipients.find(r => r.userId === recipient.userId);
            if (recipientDoc) {
              recipientDoc.status = MessageStatus.DELIVERED;
              recipientDoc.deliveredAt = new Date();
            }
          } catch (error) {
            logger.error('Failed to deliver message to recipient', {
              messageId,
              recipientId: recipient.userId,
              error: error.message
            });
          }
        }

        await message.save();

      } catch (error) {
        logger.error('Failed to process message delivery', {
          messageId,
          error: error.message
        });
        throw error;
      }
    });
  }

  static async sendBulkEmail(
    template: string,
    recipients: string[],
    data: Record<string, any>
  ): Promise<void> {
    const users = await User.find({ _id: { $in: recipients }, isActive: true });
    
    const emailPromises = users.map(user =>
      sendEmail({
        to: user.email,
        template,
        data: {
          ...data,
          recipientName: user.firstName
        }
      })
    );

    await Promise.all(emailPromises);
  }

  private static async storeMessageHistory(message: any): Promise<void> {
    const key = `messages:history:${message.from}`;
    const history = await redisService.get(key) || [];
    
    history.unshift(message);
    if (history.length > 100) history.pop();
    
    await redisService.set(key, history);
  }

  static async getMessageHistory(userId: string): Promise<any[]> {
    const key = `messages:history:${userId}`;
    return await redisService.get(key) || [];
  }

  static async sendMassEmail(
    recipients: string[],
    templateName: string,
    data: Record<string, any>,
    attachments?: Express.Multer.File[]
  ): Promise<void> {
    const template = await Template.findOne({ name: templateName });
    if (!template) {
      throw new AppError(404, 'Email template not found');
    }

    const users = await User.find({ 
      _id: { $in: recipients },
      isActive: true 
    });

    const emailPromises = users.map(user => {
      const personalizedContent = this.replaceTemplateVariables(
        template.content,
        {
          ...data,
          recipientName: user.firstName,
          recipientEmail: user.email
        }
      );

      return sendEmail({
        to: user.email,
        subject: template.subject,
        html: personalizedContent,
        attachments: attachments?.map(file => ({
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype
        }))
      });
    });

    await Promise.all(emailPromises);

    // Log communication history
    await this.logCommunication({
      type: CommunicationType.EMAIL,
      templateName,
      recipients: users.map(u => u._id),
      data,
      timestamp: new Date()
    });
  }

  private static replaceTemplateVariables(
    content: string,
    data: Record<string, any>
  ): string {
    return content.replace(/\{\{(.*?)\}\}/g, (match, variable) => {
      const key = variable.trim();
      return data[key] || match;
    });
  }

  private static async logCommunication(log: any): Promise<void> {
    const key = `communication:history:${new Date().toISOString().split('T')[0]}`;
    const history = await redisService.get(key) || [];
    history.push(log);
    await redisService.set(key, history, 86400); // Store for 24 hours
  }

  static async createTemplate(template: ICommunicationTemplate): Promise<void> {
    const existingTemplate = await Template.findOne({ name: template.name });
    if (existingTemplate) {
      throw new AppError(400, 'Template with this name already exists');
    }

    await Template.create(template);
  }

  static async getCommunicationHistory(
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const keys = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      keys.push(
        `communication:history:${current.toISOString().split('T')[0]}`
      );
      current.setDate(current.getDate() + 1);
    }

    const histories = await Promise.all(
      keys.map(key => redisService.get(key))
    );

    return histories.flat().filter(Boolean);
  }
}

// Initialize the service
CommunicationService.initialize(); 
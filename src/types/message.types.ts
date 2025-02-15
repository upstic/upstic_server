import { Schema } from 'mongoose';

export type MessageType = 
  | 'text'
  | 'image'
  | 'file'
  | 'system'
  | 'action'
  | 'notification';

export type MessageStatus = 
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type ConversationType = 
  | 'direct'
  | 'group'
  | 'channel'
  | 'support';

export interface MessageContent {
  text?: string;
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    thumbnailUrl?: string;
    name: string;
    size: number;
    mimeType: string;
    duration?: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
  action?: {
    type: string;
    payload: any;
  };
  metadata?: Record<string, any>;
}

export interface MessageReaction {
  type: string;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
}

export interface MessageReceipt {
  userId: Schema.Types.ObjectId;
  status: MessageStatus;
  timestamp: Date;
}

export interface MessageThread {
  parentId: Schema.Types.ObjectId;
  replyCount: number;
  lastReplyAt: Date;
  participants: Schema.Types.ObjectId[];
}

export interface MessageMention {
  userId: Schema.Types.ObjectId;
  type: 'user' | 'channel' | 'everyone';
  offset: number;
  length: number;
}

export interface ConversationMember {
  userId: Schema.Types.ObjectId;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  lastReadAt: Date;
  isActive: boolean;
  settings?: {
    muted: boolean;
    notifications: 'all' | 'mentions' | 'none';
  };
}

export interface MessageSearchParams {
  conversationId?: Schema.Types.ObjectId;
  senderId?: Schema.Types.ObjectId;
  type?: MessageType[];
  status?: MessageStatus[];
  keyword?: string;
  hasMedia?: boolean;
  hasThread?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface MessageStats {
  totalMessages: number;
  messagesByType: Record<MessageType, number>;
  averageResponseTime: number;
  activeConversations: number;
  mediaStorage: {
    total: number;
    byType: Record<string, number>;
  };
  engagementMetrics: {
    reactionsCount: number;
    repliesCount: number;
    mentionsCount: number;
  };
}

export interface ConversationSettings {
  name?: string;
  description?: string;
  avatar?: string;
  isPrivate: boolean;
  allowThreads: boolean;
  allowReactions: boolean;
  allowMedia: boolean;
  retentionPeriod?: number;
  maxParticipants?: number;
  customSettings?: Record<string, any>;
}

export interface MessageNotification {
  type: 'message' | 'mention' | 'reply' | 'reaction';
  conversationId: Schema.Types.ObjectId;
  messageId: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  recipientId: Schema.Types.ObjectId;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
} 
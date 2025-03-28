import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for message status
 */
export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  DELETED = 'DELETED'
}

/**
 * Enum for message type
 */
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  LOCATION = 'LOCATION',
  SYSTEM = 'SYSTEM'
}

/**
 * Enum for conversation type
 */
export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  CHANNEL = 'CHANNEL',
  SUPPORT = 'SUPPORT'
}

/**
 * Interface for message
 */
export interface IMessage extends Document {
  // Relationships
  conversationId: Types.ObjectId | string;
  senderId: Types.ObjectId | string;
  
  // Core data
  content: string;
  type: MessageType;
  
  // Status
  status: MessageStatus;
  deliveredTo: Array<{
    userId: Types.ObjectId | string;
    deliveredAt: Date;
  }>;
  readBy: Array<{
    userId: Types.ObjectId | string;
    readAt: Date;
  }>;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Attachments
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
    thumbnailUrl?: string;
  }>;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Interface for conversation
 */
export interface IConversation extends Document {
  // Core data
  type: ConversationType;
  title?: string;
  
  // Participants
  participants: Array<{
    userId: Types.ObjectId | string;
    role: 'admin' | 'member';
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
  }>;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Status
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId | string;
  
  // Last message
  lastMessageId?: Types.ObjectId | string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for message
 */
const messageSchema = new Schema<IMessage>(
  {
    // Relationships
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true
    },
    
    // Core data
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
      index: true
    },
    
    // Status
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
      index: true
    },
    deliveredTo: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      deliveredAt: {
        type: Date,
        default: Date.now
      }
    }],
    readBy: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed
    },
    
    // Attachments
    attachments: [{
      name: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      size: {
        type: Number,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      thumbnailUrl: {
        type: String
      }
    }],
    
    // Audit fields
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

/**
 * Schema for conversation
 */
const conversationSchema = new Schema<IConversation>(
  {
    // Core data
    type: {
      type: String,
      enum: Object.values(ConversationType),
      required: [true, 'Conversation type is required'],
      index: true
    },
    title: {
      type: String,
      trim: true
    },
    
    // Participants
    participants: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      leftAt: {
        type: Date
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed
    },
    
    // Status
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Last message
    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    lastMessageAt: {
      type: Date
    },
    lastMessagePreview: {
      type: String
    },
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ status: 1, createdAt: -1 });

conversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });
conversationSchema.index({ 'participants.userId': 1, 'participants.isActive': 1, updatedAt: -1 });
conversationSchema.index({ createdBy: 1, updatedAt: -1 });

// Soft delete for messages
messageSchema.methods.softDelete = async function(): Promise<IMessage> {
  this.status = MessageStatus.DELETED;
  this.deletedAt = new Date();
  return this.save();
};

// Mark message as delivered
messageSchema.methods.markAsDelivered = async function(
  userId: Types.ObjectId | string
): Promise<IMessage> {
  const isDelivered = this.deliveredTo.some(
    delivery => delivery.userId.toString() === userId.toString()
  );
  
  if (!isDelivered) {
    this.deliveredTo.push({
      userId,
      deliveredAt: new Date()
    });
    
    this.status = MessageStatus.DELIVERED;
  }
  
  return this.save();
};

// Mark message as read
messageSchema.methods.markAsRead = async function(
  userId: Types.ObjectId | string
): Promise<IMessage> {
  const isRead = this.readBy.some(
    read => read.userId.toString() === userId.toString()
  );
  
  if (!isRead) {
    this.readBy.push({
      userId,
      readAt: new Date()
    });
    
    this.status = MessageStatus.READ;
  }
  
  return this.save();
};

// Find messages by conversation
messageSchema.statics.findByConversation = async function(
  conversationId: Types.ObjectId | string,
  limit = 50,
  skip = 0
): Promise<IMessage[]> {
  return this.find({
    conversationId,
    status: { $ne: MessageStatus.DELETED }
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'firstName lastName email profileImage');
};

// Find unread messages for user
messageSchema.statics.findUnreadForUser = async function(
  userId: Types.ObjectId | string
): Promise<IMessage[]> {
  return this.find({
    'readBy.userId': { $ne: userId },
    status: { $ne: MessageStatus.DELETED }
  })
    .populate('conversationId')
    .populate('senderId', 'firstName lastName email profileImage');
};

// Add participant to conversation
conversationSchema.methods.addParticipant = async function(
  userId: Types.ObjectId | string,
  role: 'admin' | 'member' = 'member'
): Promise<IConversation> {
  const existingParticipant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    if (!existingParticipant.isActive) {
      existingParticipant.isActive = true;
      existingParticipant.leftAt = undefined;
      existingParticipant.joinedAt = new Date();
    }
  } else {
    this.participants.push({
      userId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

// Remove participant from conversation
conversationSchema.methods.removeParticipant = async function(
  userId: Types.ObjectId | string
): Promise<IConversation> {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isActive = false;
    participant.leftAt = new Date();
  }
  
  return this.save();
};

// Archive conversation
conversationSchema.methods.archive = async function(
  userId: Types.ObjectId | string
): Promise<IConversation> {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  
  return this.save();
};

// Unarchive conversation
conversationSchema.methods.unarchive = async function(): Promise<IConversation> {
  this.isArchived = false;
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  
  return this.save();
};

// Update last message
conversationSchema.methods.updateLastMessage = async function(
  messageId: Types.ObjectId | string,
  messageContent: string
): Promise<IConversation> {
  this.lastMessageId = messageId;
  this.lastMessageAt = new Date();
  this.lastMessagePreview = messageContent.substring(0, 100);
  
  return this.save();
};

// Find conversations for user
conversationSchema.statics.findForUser = async function(
  userId: Types.ObjectId | string,
  includeArchived = false
): Promise<IConversation[]> {
  const query: any = {
    'participants.userId': userId,
    'participants.isActive': true
  };
  
  if (!includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate('lastMessageId')
    .populate('participants.userId', 'firstName lastName email profileImage');
};

// Find direct conversation between users
conversationSchema.statics.findDirectConversation = async function(
  userIdA: Types.ObjectId | string,
  userIdB: Types.ObjectId | string
): Promise<IConversation | null> {
  return this.findOne({
    type: ConversationType.DIRECT,
    'participants.userId': { $all: [userIdA, userIdB] },
    'participants.isActive': true
  });
};

// Create direct conversation
conversationSchema.statics.createDirectConversation = async function(
  userIdA: Types.ObjectId | string,
  userIdB: Types.ObjectId | string
): Promise<IConversation> {
  return this.create({
    type: ConversationType.DIRECT,
    participants: [
      {
        userId: userIdA,
        role: 'member',
        joinedAt: new Date(),
        isActive: true
      },
      {
        userId: userIdB,
        role: 'member',
        joinedAt: new Date(),
        isActive: true
      }
    ],
    createdBy: userIdA
  });
};

// Export the models
export const Message = model<IMessage>('Message', messageSchema);
export const Conversation = model<IConversation>('Conversation', conversationSchema); 
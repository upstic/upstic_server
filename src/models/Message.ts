import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Schema.Types.ObjectId;
  sender: {
    userId: Schema.Types.ObjectId;
    userType: 'worker' | 'client' | 'recruiter' | 'system';
  };
  recipient: {
    userId: Schema.Types.ObjectId;
    userType: 'worker' | 'client' | 'recruiter';
  };
  type: 'text' | 'file' | 'notification' | 'system';
  content: {
    text?: string;
    file?: {
      url: string;
      name: string;
      size: number;
      type: string;
    };
    notification?: {
      title: string;
      body: string;
      action?: {
        type: string;
        payload: any;
      };
    };
  };
  metadata: {
    jobId?: Schema.Types.ObjectId;
    applicationId?: Schema.Types.ObjectId;
    interviewId?: Schema.Types.ObjectId;
  };
  status: {
    delivered: boolean;
    read: boolean;
    readAt?: Date;
  };
  replyTo?: Schema.Types.ObjectId;
  reactions?: Array<{
    userId: Schema.Types.ObjectId;
    type: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const MessageSchema: Schema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userType: {
      type: String,
      enum: ['worker', 'client', 'recruiter', 'system'],
      required: true
    }
  },
  recipient: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userType: {
      type: String,
      enum: ['worker', 'client', 'recruiter'],
      required: true
    }
  },
  type: {
    type: String,
    enum: ['text', 'file', 'notification', 'system'],
    required: true
  },
  content: {
    text: String,
    file: {
      url: String,
      name: String,
      size: Number,
      type: String
    },
    notification: {
      title: String,
      body: String,
      action: {
        type: String,
        payload: Schema.Types.Mixed
      }
    }
  },
  metadata: {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
    interviewId: { type: Schema.Types.ObjectId, ref: 'Interview' }
  },
  status: {
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    readAt: Date
  },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ 'sender.userId': 1 });
MessageSchema.index({ 'recipient.userId': 1 });
MessageSchema.index({ 'metadata.jobId': 1 });
MessageSchema.index({ 'metadata.applicationId': 1 });

// Methods
MessageSchema.methods.markAsDelivered = async function() {
  this.status.delivered = true;
  await this.save();
};

MessageSchema.methods.markAsRead = async function() {
  this.status.read = true;
  this.status.readAt = new Date();
  await this.save();
};

MessageSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  await this.save();
};

MessageSchema.methods.addReaction = async function(userId: Schema.Types.ObjectId, reactionType: string) {
  const existingReaction = this.reactions.find(
    (reaction: { userId: Schema.Types.ObjectId; type: string; createdAt: Date }) =>
      reaction.userId.toString() === userId.toString()
  );


  if (existingReaction) {
    existingReaction.type = reactionType;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({
      userId,
      type: reactionType,
      createdAt: new Date()
    });
  }

  await this.save();
};

// Statics
MessageSchema.statics.getUnreadCount = async function(userId: Schema.Types.ObjectId) {
  return this.countDocuments({
    'recipient.userId': userId,
    'status.read': false,
    deletedAt: null
  });
};

// Query Middleware
MessageSchema.pre('find', function() {
  this.where({ deletedAt: null });
});

MessageSchema.pre('findOne', function() {
  this.where({ deletedAt: null });
});

export default mongoose.model<IMessage>('Message', MessageSchema); 
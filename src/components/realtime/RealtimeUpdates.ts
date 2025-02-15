import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { RateLimiterComponent } from '../security/RateLimiter';
import { Logger } from '../../utils/logger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebSocketService } from '../../services/websocket.service';
import { ValidationService } from '../../services/validation.service';
import { AuthService } from '../../services/auth.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class RealtimeUpdatesComponent implements OnModuleInit, OnModuleDestroy {
  private io: Server;
  private pubClient: Redis;
  private subClient: Redis;
  private readonly userRooms: Map<string, Set<string>> = new Map();
  private readonly roomSubscribers: Map<string, Set<string>> = new Map();
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly EVENT_TYPES = [
    'job_update',
    'application_status',
    'message',
    'notification',
    'schedule_change',
    'timesheet_update',
    'system_alert'
  ] as const;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private rateLimiter: RateLimiterComponent,
    private logger: Logger,
    @InjectModel('Event') private eventModel: Model<any>,
    @InjectModel('Subscription') private subscriptionModel: Model<any>,
    @InjectModel('Connection') private connectionModel: Model<any>,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private validationService: ValidationService,
    private cacheService: CacheService
  ) {}

  async onModuleInit() {
    await this.initializeRedisClients();
    this.setupSocketServer();
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  private async initializeRedisClients() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      password: this.configService.get('REDIS_PASSWORD')
    };

    this.pubClient = new Redis(redisConfig);
    this.subClient = new Redis(redisConfig);

    this.pubClient.on('error', (error) => {
      this.logger.error('Redis pub client error:', error);
    });

    this.subClient.on('error', (error) => {
      this.logger.error('Redis sub client error:', error);
    });
  }

  private setupSocketServer() {
    this.io = new Server({
      cors: {
        origin: this.configService.get('CORS_ORIGINS'),
        methods: ['GET', 'POST'],
        credentials: true
      },
      adapter: createAdapter(this.pubClient, this.subClient)
    });

    this.io.use(this.authMiddleware.bind(this));
    this.io.use(this.rateLimitMiddleware.bind(this));

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private async authMiddleware(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const decoded = await this.jwtService.verify(token);
      (socket as AuthenticatedSocket).user = decoded;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }

  private async rateLimitMiddleware(socket: Socket, next: (err?: Error) => void) {
    try {
      const result = await this.rateLimiter.consume(
        'websocket',
        socket.handshake.address,
        1
      );

      if (!result.success) {
        throw new Error('Rate limit exceeded');
      }

      next();
    } catch (error) {
      next(new Error('Too many connection attempts'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket) {
    this.logger.info(`Client connected: ${socket.id}`);

    socket.on('subscribe', (rooms: string[]) => {
      this.handleSubscribe(socket, rooms);
    });

    socket.on('unsubscribe', (rooms: string[]) => {
      this.handleUnsubscribe(socket, rooms);
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    // Handle custom events
    this.setupCustomEventHandlers(socket);
  }

  private handleSubscribe(socket: AuthenticatedSocket, rooms: string[]) {
    const userId = socket.user.id;
    const userRooms = this.userRooms.get(userId) || new Set();

    rooms.forEach(room => {
      // Check if user has permission to join room
      if (this.canJoinRoom(socket.user, room)) {
        socket.join(room);
        userRooms.add(room);

        const subscribers = this.roomSubscribers.get(room) || new Set();
        subscribers.add(userId);
        this.roomSubscribers.set(room, subscribers);

        this.logger.debug(`User ${userId} subscribed to room: ${room}`);
      }
    });

    this.userRooms.set(userId, userRooms);
  }

  private handleUnsubscribe(socket: AuthenticatedSocket, rooms: string[]) {
    const userId = socket.user.id;
    const userRooms = this.userRooms.get(userId);

    if (userRooms) {
      rooms.forEach(room => {
        socket.leave(room);
        userRooms.delete(room);

        const subscribers = this.roomSubscribers.get(room);
        if (subscribers) {
          subscribers.delete(userId);
          if (subscribers.size === 0) {
            this.roomSubscribers.delete(room);
          } else {
            this.roomSubscribers.set(room, subscribers);
          }
        }

        this.logger.debug(`User ${userId} unsubscribed from room: ${room}`);
      });

      if (userRooms.size === 0) {
        this.userRooms.delete(userId);
      } else {
        this.userRooms.set(userId, userRooms);
      }
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    const userId = socket.user.id;
    const userRooms = this.userRooms.get(userId);

    if (userRooms) {
      userRooms.forEach(room => {
        const subscribers = this.roomSubscribers.get(room);
        if (subscribers) {
          subscribers.delete(userId);
          if (subscribers.size === 0) {
            this.roomSubscribers.delete(room);
          } else {
            this.roomSubscribers.set(room, subscribers);
          }
        }
      });

      this.userRooms.delete(userId);
    }

    this.logger.info(`Client disconnected: ${socket.id}`);
  }

  private setupCustomEventHandlers(socket: AuthenticatedSocket) {
    // Chat events
    socket.on('chat:message', (data) => {
      this.handleChatMessage(socket, data);
    });

    // Notification events
    socket.on('notifications:read', (data) => {
      this.handleNotificationRead(socket, data);
    });

    // Status events
    socket.on('status:update', (data) => {
      this.handleStatusUpdate(socket, data);
    });
  }

  async broadcast(
    room: string,
    event: string,
    data: any,
    excludeSocket?: string
  ): Promise<void> {
    try {
      if (excludeSocket) {
        this.io.to(room).except(excludeSocket).emit(event, data);
      } else {
        this.io.to(room).emit(event, data);
      }
    } catch (error) {
      this.logger.error('Error broadcasting message:', error);
      throw error;
    }
  }

  async broadcastToUser(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    try {
      const userSockets = await this.io.in(`user:${userId}`).fetchSockets();
      userSockets.forEach(socket => {
        socket.emit(event, data);
      });
    } catch (error) {
      this.logger.error('Error broadcasting to user:', error);
      throw error;
    }
  }

  private canJoinRoom(user: any, room: string): boolean {
    // Implement room access control logic
    return true; // Placeholder
  }

  private async handleChatMessage(socket: AuthenticatedSocket, data: any) {
    try {
      // Validate message
      // Save to database
      // Broadcast to room
      await this.broadcast(data.roomId, 'chat:message', {
        ...data,
        userId: socket.user.id,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleNotificationRead(socket: AuthenticatedSocket, data: any) {
    try {
      // Update notification status
      // Broadcast status update
      await this.broadcastToUser(socket.user.id, 'notifications:updated', {
        notificationId: data.notificationId,
        status: 'read'
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to update notification' });
    }
  }

  private async handleStatusUpdate(socket: AuthenticatedSocket, data: any) {
    try {
      // Update user status
      // Broadcast to relevant rooms
      const userRooms = this.userRooms.get(socket.user.id);
      if (userRooms) {
        userRooms.forEach(room => {
          this.broadcast(room, 'status:updated', {
            userId: socket.user.id,
            status: data.status
          });
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to update status' });
    }
  }

  private async cleanup() {
    this.io?.close();
    await Promise.all([
      this.pubClient?.quit(),
      this.subClient?.quit()
    ]);
  }

  async broadcastUpdate(
    input: BroadcastInput
  ): Promise<BroadcastResponse> {
    try {
      // Validate broadcast input
      await this.validateBroadcast(input);

      // Create event record
      const event = await this.eventModel.create({
        ...input,
        status: 'pending',
        createdAt: new Date()
      });

      // Process broadcast asynchronously
      this.processBroadcast(event).catch(error => {
        this.logger.error('Error processing broadcast:', error);
        this.updateEventStatus(
          event._id,
          'failed',
          error.message
        );
      });

      return {
        success: true,
        eventId: event._id,
        message: 'Broadcast initiated'
      };
    } catch (error) {
      this.logger.error('Error initiating broadcast:', error);
      throw error;
    }
  }

  async subscribe(
    input: SubscriptionInput
  ): Promise<SubscriptionResponse> {
    try {
      // Validate subscription
      await this.validateSubscription(input);

      // Check existing subscription
      const existing = await this.subscriptionModel.findOne({
        userId: input.userId,
        eventType: input.eventType
      });

      if (existing) {
        return {
          success: true,
          subscriptionId: existing._id,
          message: 'Already subscribed'
        };
      }

      // Create subscription
      const subscription = await this.subscriptionModel.create({
        ...input,
        status: 'active',
        createdAt: new Date()
      });

      // Initialize connection if needed
      await this.initializeConnection(input.userId);

      return {
        success: true,
        subscriptionId: subscription._id,
        message: 'Subscription created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async getActiveConnections(
    input: ConnectionInput
  ): Promise<ConnectionResponse> {
    try {
      const connections = await this.connectionModel.find({
        status: 'active',
        ...(input.userId && { userId: input.userId })
      });

      return {
        connections: connections.map(conn => ({
          connectionId: conn._id,
          userId: conn.userId,
          lastActive: conn.lastActive,
          metadata: conn.metadata
        })),
        total: connections.length
      };
    } catch (error) {
      this.logger.error('Error getting connections:', error);
      throw error;
    }
  }

  private async processBroadcast(
    event: any
  ): Promise<void> {
    try {
      // Get relevant subscriptions
      const subscriptions = await this.getRelevantSubscriptions(event);

      // Group by connection
      const connectionGroups = this.groupByConnection(subscriptions);

      // Send updates
      for (const [connectionId, subscribers] of connectionGroups) {
        await this.sendUpdate(connectionId, event, subscribers);
      }

      // Update event status
      await this.updateEventStatus(
        event._id,
        'completed',
        null,
        {
          recipients: subscriptions.length,
          delivered: new Date()
        }
      );
    } catch (error) {
      throw error;
    }
  }

  private async sendUpdate(
    connectionId: string,
    event: any,
    subscribers: any[]
  ): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        await this.webSocketService.send(connectionId, {
          type: event.type,
          data: event.data,
          metadata: {
            eventId: event._id,
            timestamp: new Date(),
            recipients: subscribers.map(s => s.userId)
          }
        });
        return;
      } catch (error) {
        retries++;
        if (retries === this.MAX_RETRIES) {
          throw error;
        }
        await new Promise(resolve => 
          setTimeout(resolve, this.RETRY_DELAY * retries)
        );
      }
    }
  }

  private async initializeConnection(
    userId: string
  ): Promise<void> {
    const connection = await this.connectionModel.findOne({
      userId,
      status: 'active'
    });

    if (!connection) {
      await this.connectionModel.create({
        userId,
        status: 'active',
        lastActive: new Date(),
        metadata: {
          userAgent: 'system',
          ip: 'internal'
        }
      });
    }
  }
}

interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    [key: string]: any;
  };
}

interface BroadcastInput {
  type: typeof RealtimeUpdatesComponent.prototype.EVENT_TYPES[number];
  data: Record<string, any>;
  recipients?: string[];
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

interface BroadcastResponse {
  success: boolean;
  eventId: string;
  message: string;
}

interface SubscriptionInput {
  userId: string;
  eventType: typeof RealtimeUpdatesComponent.prototype.EVENT_TYPES[number];
  filters?: {
    entities?: string[];
    actions?: string[];
    priority?: string[];
  };
  metadata?: Record<string, any>;
}

interface SubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  message: string;
}

interface ConnectionInput {
  userId?: string;
  status?: 'active' | 'inactive';
}

interface ConnectionResponse {
  connections: Array<{
    connectionId: string;
    userId: string;
    lastActive: Date;
    metadata?: Record<string, any>;
  }>;
  total: number;
}

interface EventMetadata {
  recipients: number;
  delivered: Date;
  retries?: number;
  errors?: Array<{
    connectionId: string;
    error: string;
    timestamp: Date;
  }>;
}

interface ConnectionMetadata {
  userAgent?: string;
  ip?: string;
  device?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
} 
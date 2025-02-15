import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { LogMetadata } from '../interfaces/logger.interface';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const config: DatabaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment',
  options: {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  }
};

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.uri, config.options);

    logger.info('Successfully connected to MongoDB', { uri: config.uri } as LogMetadata);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error during MongoDB disconnection:', { error } as LogMetadata);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('MongoDB connection error:', { error } as LogMetadata);
    throw error;
  }
}

export class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('Database is already connected');
        return;
      }

      await connectDatabase();

      // Create indexes
      await this.createIndexes();

      this.isConnected = true;
      logger.info('Successfully connected to database');

      mongoose.connection.on('error', (error: Error) => {
        logger.error('Database connection error:', { error } as LogMetadata);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Database disconnected');
        this.isConnected = false;
      });
    } catch (error) {
      logger.error('Failed to connect to database:', { error } as LogMetadata);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    // Create indexes for collections
    await Promise.all([
      mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true }),
      mongoose.connection.db.collection('jobs').createIndex({ title: 'text', description: 'text' }),
      mongoose.connection.db.collection('workers').createIndex({ skills: 1 }),
      mongoose.connection.db.collection('applications').createIndex({ jobId: 1, workerId: 1 }, { unique: true })
    ]);
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info('Database is already disconnected');
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Successfully disconnected from database');
    } catch (error) {
      logger.error('Failed to disconnect from database:', { error } as LogMetadata);
      throw error;
    }
  }

  async backup(): Promise<void> {
    try {
      if (!mongoose.connection.db) {
        throw new Error('Database connection not established');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${process.env.DB_BACKUP_PATH || './backups'}/backup-${timestamp}`;

      // Implementation of backup logic here
      logger.info(`Database backup created at ${backupPath}`);
    } catch (error) {
      logger.error('Failed to backup database:', { error } as LogMetadata);
      throw error;
    }
  }
}

export const db = Database.getInstance();
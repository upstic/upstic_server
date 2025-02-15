import dotenv from 'dotenv';

dotenv.config();

// Parse Redis URL
const parseRedisUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port),
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
    };
  } catch (error) {
    console.error('Error parsing Redis URL:', error);
    return {
      host: 'localhost',
      port: 6379
    };
  }
};

const redisConfig = parseRedisUrl(process.env.REDIS_URL || '');

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redis: {
    host: redisConfig.host,
    port: redisConfig.port,
    username: redisConfig.username,
    password: redisConfig.password,
    maxMemoryPolicy: 'noeviction',
    maxMemory: '2gb'
  },
  environment: process.env.NODE_ENV || 'development',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@recruitment.com'
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || ''
  },
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN || '',
  }
}; 
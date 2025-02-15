import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { Multer } from 'multer';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

export const uploadToS3 = async (
  file: Express.Multer.File | Buffer,
  key: string,
  contentType?: string
): Promise<string> => {
  const body = Buffer.isBuffer(file) ? file : file.buffer;
  const mimeType = Buffer.isBuffer(file) ? contentType : file.mimetype;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: body,
    ContentType: mimeType
  }));

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  });
  await s3Client.send(command);
}; 
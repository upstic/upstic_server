import express from 'express';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { logger } from './utils/logger';
import { LogMetadata } from './interfaces/logger.interface';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Security middleware
    app.use(helmet());
    app.enableCors();

    // Validation
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Recruitment Platform API')
      .setDescription('API documentation for the recruitment platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 5000;
    await app.listen(port);
    logger.info(`Application is running on: http://localhost:${port}`, {} as LogMetadata);
  } catch (error) {
    logger.error('Error starting application:', { error } as LogMetadata);
    process.exit(1);
  }
}

bootstrap();
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { logger } from '../utils/logger';
import { LogMetadata } from '../interfaces/logger.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedException('No authorization header found');
      }

      const [type, token] = authHeader.split(' ');

      if (type !== 'Bearer') {
        throw new UnauthorizedException('Invalid authorization type');
      }

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      try {
        const payload = await this.jwtService.verifyAsync(token);
        request.user = payload;
        return true;
      } catch (error) {
        logger.error('Token verification failed:', { error } as LogMetadata);
        throw new UnauthorizedException('Invalid token');
      }
    } catch (error) {
      logger.error('Authentication failed:', { error } as LogMetadata);
      throw error;
    }
  }
}

import { UserRole } from './user.interface';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sub: string;
  iat?: number;
  exp?: number;
}

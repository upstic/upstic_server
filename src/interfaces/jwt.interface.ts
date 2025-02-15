import { UserRole } from './user.interface';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  organizationId?: string;
  exp: number;
  iat: number;
  sub: string;
}

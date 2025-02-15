import { JwtPayload as BaseJwtPayload } from 'jsonwebtoken';

export interface JwtPayload extends BaseJwtPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
  // Add other JWT payload fields as needed
} 
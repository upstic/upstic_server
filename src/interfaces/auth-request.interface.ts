import { Request } from 'express';
import { UserRole } from './user.interface';
import { Types } from 'mongoose';
import { JwtPayload } from './jwt-payload.interface';

// This interface represents the user object as it's set by the auth middleware
// It's based on the actual user document from the database
export interface AuthUser {
  _id: Types.ObjectId | string;
  id: string; // Virtual getter or alias for _id
  userId: string; // Required for compatibility with JwtPayload
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
  [key: string]: any; // Allow additional properties
}

// We're extending the Express Request interface
// The user property is already defined in the Express namespace
export interface AuthRequest extends Request {} 
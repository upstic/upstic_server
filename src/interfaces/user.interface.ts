import { Document, Model, Types } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  CLIENT = 'client',
  WORKER = 'worker'
}

// Base interface for User properties
export interface IUserBase {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  name?: string; // Computed property
  loginCount: number;
  permissions: string[];
  lastLogin?: Date;
  organizationId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Document interface
export interface IUserDocument extends IUserBase, Document {
  _id: Types.ObjectId;
  name: string; // Getter for firstName + lastName
}

// Model interface
export interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument>;
}

// For token generation
export interface IUserTokenPayload {
  _id: Types.ObjectId;
  email: string;
  role: UserRole;
}

// Interface for tokens
export interface IUserTokens {
  accessToken: string;
  refreshToken: string;
}

// Interface for API responses (never expose password)
export interface IUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  organizationId?: string;
}

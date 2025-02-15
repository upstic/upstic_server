export enum UserRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  CLIENT = 'client',
  WORKER = 'worker'
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserSession {
  userId: string;
  roles: UserRole[];
  email: string;
  iat?: number;
  exp?: number;
}

import { IUser } from '../../models/User';
import { UserRole } from '../../interfaces/user.interface';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Extend the Express namespace to add our custom user property to the Request interface
declare namespace Express {
  interface User {
    _id?: Types.ObjectId | string;
    id: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    isActive?: boolean;
    permissions?: string[];
    [key: string]: any;
  }

  interface Request {
    user: User;
  }
} 
import { Request } from 'express';
import { IUser } from '../interfaces/user.interface';

export function CurrentUser() {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    Reflect.defineMetadata('currentUser', {
      index: parameterIndex,
      propertyKey,
    }, target, propertyKey);
  };
}

export function extractUser(req: Request): IUser | undefined {
  return (req as any).user;
}

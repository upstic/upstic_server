import { UserRole } from '../interfaces/user.interface';

export function Roles(...roles: UserRole[]) {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        // Add roles metadata to the method
        Reflect.defineMetadata('roles', roles, descriptor.value);
        return originalMethod.apply(this, args);
      };

      return descriptor;
    }
    
    // Add roles metadata to the class
    Reflect.defineMetadata('roles', roles, target);
    return target;
  };
}

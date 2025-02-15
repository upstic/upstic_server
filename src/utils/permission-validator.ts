import { IClientRole } from '../models/ClientRole';

export const validatePermissions = (permissions: string[]): boolean => {
  const validPermissions = [
    'read',
    'write',
    'delete',
    'manage_users',
    'manage_roles',
    'manage_billing'
  ];
  
  return permissions.every(permission => 
    validPermissions.includes(permission)
  );
}; 
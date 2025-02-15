import Joi from 'joi';
import { UserRole } from '../models/User';

export const userSchema = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
    name: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid(...Object.values(UserRole)).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).messages({
      'string.pattern.base': 'Phone number must be in E.164 format'
    }),
    isActive: Joi.boolean()
  }),

  update: Joi.object({
    email: Joi.string().email(),
    name: Joi.string().min(2).max(50),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    isActive: Joi.boolean()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .invalid(Joi.ref('currentPassword'))
      .messages({
        'any.invalid': 'New password must be different from current password'
      })
  })
}; 
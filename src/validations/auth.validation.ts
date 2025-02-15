import Joi from 'joi';
import { UserRole } from '../models/User';

export const authValidation = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
}; 
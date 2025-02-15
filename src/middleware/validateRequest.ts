import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { AppError } from './errorHandler';

export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationOptions = {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      };

      const { error, value } = schema.validate(
        {
          body: req.body,
          query: req.query,
          params: req.params
        },
        validationOptions
      );

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        throw new AppError(400, 'Validation error', validationErrors);
      }

      // Update req with validated values
      req.body = value.body;
      req.query = value.query;
      req.params = value.params;

      next();
    } catch (error) {
      next(error);
    }
  };
}; 
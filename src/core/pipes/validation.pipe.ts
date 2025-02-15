import { validate, ValidationError as ClassValidatorError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BadRequestException } from '../exceptions/http.exception';

interface ValidationError {
  property: string;
  constraints: Record<string, string>;
}

export class ValidationPipe {
  async transform<T extends object>(value: Record<string, any>, metatype: new () => T): Promise<T> {
    if (!metatype || !this.toValidate(metatype)) {
      return value as T;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const formattedErrors = errors.map((error: ClassValidatorError) => ({
        property: error.property,
        constraints: error.constraints || {},
      }));
      throw new BadRequestException('Validation failed', formattedErrors);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}

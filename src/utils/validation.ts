import { Injectable } from '@nestjs/common';
import * as emailValidator from 'email-validator';
import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';
import * as postalCodes from 'postal-codes-js';
import { isValid, parse } from 'date-fns';
import { Logger } from './logger';

const logger = new Logger('ValidationUtils');

@Injectable()
export class ValidationUtils {
  static validateEmail(email: string): boolean {
    try {
      return emailValidator.validate(email);
    } catch (error) {
      logger.error('Error validating email:', { error, email });
      return false;
    }
  }

  static validatePhoneNumber(phoneNumber: string, countryCode: CountryCode = 'US'): boolean {
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber, { defaultCountry: countryCode });
      return parsedNumber?.isValid() || false;
    } catch (error) {
      logger.error('Error validating phone number:', { error, phoneNumber, countryCode });
      return false;
    }
  }

  static validatePostalCode(postalCode: string, countryCode: string = 'US'): boolean {
    try {
      return postalCodes.validate(countryCode, postalCode) === true;
    } catch (error) {
      logger.error('Error validating postal code:', { error, postalCode, countryCode });
      return false;
    }
  }

  static validateDate(date: string | Date): boolean {
    try {
      if (date instanceof Date) {
        return isValid(date);
      }
      const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
      return isValid(parsedDate);
    } catch (error) {
      logger.error('Error validating date:', { error, date });
      return false;
    }
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validatePassword(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }

  static validate(value: any, rules: ValidationRule): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push('Value is required');
      return { isValid: false, errors };
    }

    // Skip other validations if value is not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return { isValid: true, errors };
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push('Value must be a string');
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push('Value must be a number');
          }
          break;
        case 'date':
          if (!this.validateDate(value)) {
            errors.push('Value must be a valid date');
          }
          break;
        case 'email':
          if (!this.validateEmail(value)) {
            errors.push('Value must be a valid email');
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push('Value must be an array');
          }
          break;
      }
    }

    // Min validation
    if (rules.min !== undefined) {
      if (typeof value === 'string' && value.length < rules.min) {
        errors.push(`Value must be at least ${rules.min} characters long`);
      } else if (typeof value === 'number' && value < rules.min) {
        errors.push(`Value must be at least ${rules.min}`);
      }
    }

    // Max validation
    if (rules.max !== undefined) {
      if (typeof value === 'string' && value.length > rules.max) {
        errors.push(`Value must be at most ${rules.max} characters long`);
      } else if (typeof value === 'number' && value > rules.max) {
        errors.push(`Value must be at most ${rules.max}`);
      }
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string') {
      if (!rules.pattern.test(value)) {
        errors.push('Value does not match the required pattern');
      }
    }

    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      errors.push('Value failed custom validation');
    }

    return { isValid: errors.length === 0, errors };
  }
}

interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'email' | 'phone' | 'postal' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}
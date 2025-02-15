import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';
import { isObject, transform } from 'lodash';
import validator from 'validator';

// Enhanced HTML sanitization options
const sanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a'], // Minimal allowed HTML tags
  allowedAttributes: {
    'a': ['href', 'title', 'target']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'recursiveEscape',
  enforceHtmlBoundary: true
};

// XSS prevention patterns
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*[^,]/gi
];

// Enhanced value sanitization
const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    let sanitized = value;

    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    // Sanitize HTML
    sanitized = sanitizeHtml(sanitized, sanitizeOptions);

    // Escape special characters
    sanitized = validator.escape(sanitized);

    // Remove potential XSS patterns
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (isObject(value)) {
    return sanitizeObject(value);
  }

  return value;
};

const sanitizeObject = (obj: object): object => {
  return transform(obj, (result: any, value: any, key: string) => {
    // Sanitize object keys as well
    const sanitizedKey = typeof key === 'string' ? sanitizeValue(key) : key;
    result[sanitizedKey] = sanitizeValue(value);
  });
};

// Data validation functions
const dataValidators = {
  isEmail: (value: string): boolean => validator.isEmail(value),
  isURL: (value: string): boolean => validator.isURL(value),
  isAlphanumeric: (value: string): boolean => validator.isAlphanumeric(value),
  isNumeric: (value: string): boolean => validator.isNumeric(value),
  isDate: (value: string): boolean => validator.isISO8601(value),
  isPhone: (value: string): boolean => validator.isMobilePhone(value, 'any'),
  isPostalCode: (value: string): boolean => validator.isPostalCode(value, 'any')
};

// Enhanced SQL Injection prevention
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|DECLARE)\b)/gi,
  /(\b(INTO|FROM|WHERE|GROUP BY|ORDER BY|HAVING|VALUES)\b)/gi,
  /(-{2}|;)/g, // Comment markers
  /('|"|`)/g, // Quote markers
  /\b(OR|AND)\b\s+\w+\s*[=<>]/gi, // Basic boolean operations
  /\bSYSTEM\b/gi,
  /\bINFORMATION_SCHEMA\b/gi
];

// NoSQL Injection prevention patterns
const noSqlInjectionPatterns = [
  /\$where/i,
  /\$ne/i,
  /\$gt/i,
  /\$lt/i,
  /\$gte/i,
  /\$lte/i,
  /\$in/i,
  /\$nin/i,
  /\$or/i,
  /\$and/i
];

export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize headers (excluding certain headers like authorization)
    const excludedHeaders = ['authorization', 'cookie', 'x-auth-token'];
    Object.keys(req.headers).forEach(key => {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        req.headers[key] = sanitizeValue(req.headers[key]);
      }
    });

    // Sanitize body
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Enhanced injection prevention
export const injectionPrevention = (req: Request, res: Response, next: NextFunction): void => {
  const checkForInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      // Check SQL injection patterns
      if (sqlInjectionPatterns.some(pattern => pattern.test(value))) {
        return true;
      }
      // Check NoSQL injection patterns
      if (noSqlInjectionPatterns.some(pattern => pattern.test(value))) {
        return true;
      }
    }
    if (Array.isArray(value)) {
      return value.some(item => checkForInjection(item));
    }
    if (isObject(value)) {
      return Object.values(value).some(item => checkForInjection(item));
    }
    return false;
  };

  if (
    checkForInjection(req.body) ||
    checkForInjection(req.query) ||
    checkForInjection(req.params)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Potential malicious content detected'
    });
  }

  next();
};

// Data type validation middleware
export const validateDataTypes = (schema: { [key: string]: keyof typeof dataValidators }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: { field: string; message: string }[] = [];

    Object.entries(schema).forEach(([field, validatorName]) => {
      const value = req.body[field];
      if (value && !dataValidators[validatorName](value)) {
        errors.push({
          field,
          message: `Invalid ${validatorName.replace('is', '').toLowerCase()} format`
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

// Example usage:
/*
router.post('/users',
  validateDataTypes({
    email: 'isEmail',
    website: 'isURL',
    phone: 'isPhone',
    postalCode: 'isPostalCode'
  }),
  UserController.createUser
);
*/ 
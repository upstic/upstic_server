import sanitizeHtmlLib from 'sanitize-html';

const defaultOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  allowedAttributes: {
    'a': ['href', 'target']
  },
  allowedIframeHostnames: []
};

export const sanitizeHtml = (dirty: string, options = defaultOptions): string => {
  return sanitizeHtmlLib(dirty, options);
};

export const stripHtml = (dirty: string): string => {
  return sanitizeHtmlLib(dirty, { allowedTags: [] });
};

export const sanitizeObject = <T extends object>(obj: T): T => {
  const sanitized = { ...obj };
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value) as any;
    }
  });
  return sanitized;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeHtmlContent = (html: string): string => {
  return sanitizeHtml(html);
};

export const sanitizePermissions = (permissions: string[]): string[] => {
  return permissions.map(p => sanitizeInput(p));
}; 
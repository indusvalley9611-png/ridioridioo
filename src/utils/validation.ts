/**
 * NEXORA RIDE - Validation Utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  cleanedValue: string;
}

/**
 * Validates Indian cellular mobile phone numbers:
 * - Exactly 10 digits
 * - Starts with 6, 7, 8, or 9
 */
export function validateIndianMobileNumber(rawInput: string): ValidationResult {
  let cleaned = rawInput.replace(/\D/g, '');

  // Strip leading international code if provided (+91 / 91 with 12 digits)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  if (!cleaned) {
    return {
      isValid: false,
      error: 'Please enter your 10-digit mobile number',
      cleanedValue: cleaned,
    };
  }

  if (cleaned.length !== 10) {
    return {
      isValid: false,
      error: `Phone number must be exactly 10 digits (currently ${cleaned.length})`,
      cleanedValue: cleaned,
    };
  }

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9',
      cleanedValue: cleaned,
    };
  }

  return {
    isValid: true,
    cleanedValue: cleaned,
  };
}

/**
 * Formats a 10-digit number into standard Indian 5-5 grouping (e.g., 98765 43210)
 */
export function formatIndianPhoneNumber(digits: string): string {
  const cleaned = digits.replace(/\D/g, '').slice(0, 10);
  if (cleaned.length > 5) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return cleaned;
}

/**
 * Masks phone numbers for privacy & PII compliance (e.g. +91 98*** **210)
 */
export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last10 = cleaned.slice(-10);
    return `+91 ${last10.slice(0, 2)}*** **${last10.slice(-3)}`;
  }
  return phone;
}

/**
 * Strips dangerous HTML tags and trims whitespace to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>?/gm, '')
    .replace(/[<>'"]/g, '')
    .trim();
}

/**
 * Validates a user's full name
 */
export function validatePassengerName(name: string): ValidationResult {
  const sanitized = sanitizeInput(name);
  if (!sanitized || sanitized.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters',
      cleanedValue: sanitized,
    };
  }
  if (sanitized.length > 50) {
    return {
      isValid: false,
      error: 'Name cannot exceed 50 characters',
      cleanedValue: sanitized,
    };
  }
  return {
    isValid: true,
    cleanedValue: sanitized,
  };
}

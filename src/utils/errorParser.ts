/**
 * formats and parses error messages from various types of errors
 * (e.g. Axios response errors, JSON error strings, field validation maps)
 * into a clean, human-readable format.
 */
export function formatErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';

  // If error is already a string, check if it's stringified JSON
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatParsedError(parsed);
      } catch (e) {
        return error;
      }
    }
    return error;
  }

  // Handle Axios/Network/API error object structures
  if (error.response?.data) {
    const data = error.response.data;
    return formatParsedError(data);
  }

  // Handle standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Handle generic object structure
  if (typeof error === 'object') {
    return formatParsedError(error);
  }

  return String(error);
}

/**
 * Recursively parses error payloads from backend API responses
 */
function formatParsedError(parsed: any): string {
  if (!parsed) return 'An unknown error occurred.';

  // 1. Direct message/detail string or array
  if (parsed.detail) {
    if (typeof parsed.detail === 'string') return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((d: any) => (typeof d === 'string' ? d : formatParsedError(d)))
        .join('\n');
    }
    if (typeof parsed.detail === 'object') {
      return formatParsedError(parsed.detail);
    }
  }

  if (typeof parsed.message === 'string') return parsed.message;
  if (typeof parsed.error === 'string') return parsed.error;

  // 2. Field validation errors (e.g., {"email": ["Email already exists."], "password": ["Too common."]})
  const messages: string[] = [];
  for (const key in parsed) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      const value = parsed[key];
      // Format the field key to be friendly (e.g., "account_name" -> "Account name")
      const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

      if (Array.isArray(value)) {
        // e.g. "Email: Email already exists"
        messages.push(`${fieldName}: ${value.join(', ')}`);
      } else if (typeof value === 'string') {
        messages.push(`${fieldName}: ${value}`);
      } else if (typeof value === 'object' && value !== null) {
        messages.push(`${fieldName}: ${formatParsedError(value)}`);
      }
    }
  }

  if (messages.length > 0) {
    return messages.join('\n');
  }

  // Fallback
  return JSON.stringify(parsed);
}

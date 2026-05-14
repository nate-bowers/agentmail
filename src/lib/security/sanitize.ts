// Strip patterns that could be used for prompt injection or cause issues
// when user-supplied strings are embedded in LLM prompts.

const MAX_LENGTH = 200;

// Patterns that look like instruction injections
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /disregard\s+(all\s+)?previous\s+instructions?/gi,
  /disregard\s+all\s+prior/gi,
  /forget\s+(all\s+)?previous\s+instructions?/gi,
  /you\s+are\s+now\s+(?:a|an)\s+/gi,
  /new\s+instructions?:/gi,
  /system\s+prompt/gi,
  /<\s*(?:system|instructions?|prompt)\s*>/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /^system\s*:/gim,
  /^assistant\s*:/gim,
  /^---+\s*$/gm,
  /^===+\s*$/gm,
];

/**
 * Sanitize a user-supplied string before embedding it in an LLM prompt.
 * - Strips known injection patterns
 * - Truncates to MAX_LENGTH characters
 * - Trims surrounding whitespace
 */
export function sanitizeString(value: string): string {
  let result = value.trim();

  for (const pattern of INJECTION_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // Collapse multiple spaces left by replacements
  result = result.replace(/\s{2,}/g, ' ').trim();

  // Truncate
  if (result.length > MAX_LENGTH) {
    result = result.slice(0, MAX_LENGTH).trim();
  }

  return result;
}

/**
 * Recursively sanitize all string values in a plain object.
 * Non-string values (numbers, booleans, arrays, nested objects) are passed through.
 */
export function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeConfig(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

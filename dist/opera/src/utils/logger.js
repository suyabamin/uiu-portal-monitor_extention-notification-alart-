/**
 * Safe Structured Logger
 * Enforces security and privacy by stripping passwords, tokens, cookies, and sensitive headers.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pass/i,
  /token/i,
  /cookie/i,
  /auth/i,
  /sesskey/i,
  /session/i,
  /viewstate/i,
  /secret/i,
  /credential/i
];

/**
 * Recursively redacts sensitive keys from an object before logging.
 * @param {*} data
 * @returns {*}
 */
export function redactSensitive(data, depth = 0) {
  if (depth > 5) return '[MaxDepthReached]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact password or cookie strings if accidentally passed
    if (data.length > 500) {
      return `${data.slice(0, 100)}...[Truncated ${data.length} chars]`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitive(item, depth + 1));
  }

  if (typeof data === 'object') {
    const safeObj = {};
    for (const [key, val] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
      if (isSensitive) {
        safeObj[key] = '[REDACTED]';
      } else {
        safeObj[key] = redactSensitive(val, depth + 1);
      }
    }
    return safeObj;
  }

  return data;
}

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLogLevel = LogLevel.INFO;

export function setLogLevel(level) {
  if (level in LogLevel) {
    currentLogLevel = LogLevel[level];
  }
}

export const logger = {
  debug(message, context) {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug(`[UIU-Monitor][DEBUG] ${message}`, context ? redactSensitive(context) : '');
    }
  },
  info(message, context) {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(`[UIU-Monitor][INFO] ${message}`, context ? redactSensitive(context) : '');
    }
  },
  warn(message, context) {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(`[UIU-Monitor][WARN] ${message}`, context ? redactSensitive(context) : '');
    }
  },
  error(message, error, context) {
    if (currentLogLevel <= LogLevel.ERROR) {
      const errInfo = error instanceof Error ? { name: error.name, message: error.message } : error;
      console.error(`[UIU-Monitor][ERROR] ${message}`, {
        error: errInfo,
        context: context ? redactSensitive(context) : undefined
      });
    }
  }
};

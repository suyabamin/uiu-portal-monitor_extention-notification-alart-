import { describe, it, expect } from 'vitest';
import { redactSensitive } from '../../src/utils/logger.js';

describe('Logger Security & Redaction', () => {
  it('redacts sensitive fields like passwords, tokens, cookies, sesskey', () => {
    const sensitivePayload = {
      user: 'student01',
      password: 'SuperSecretPassword123!',
      token: 'bearer-abc-123',
      sesskey: 'moodle-session-key',
      ASP_NET_SessionId: 'asp-net-cookie-value',
      nested: {
        credential: 'private-data',
        safeProperty: 'public-info'
      }
    };

    const sanitized = redactSensitive(sensitivePayload);

    expect(sanitized.user).toBe('student01');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.sesskey).toBe('[REDACTED]');
    expect(sanitized.ASP_NET_SessionId).toBe('[REDACTED]');
    expect(sanitized.nested.credential).toBe('[REDACTED]');
    expect(sanitized.nested.safeProperty).toBe('public-info');
  });

  it('handles null, undefined, and non-object inputs safely', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive('clean string')).toBe('clean string');
  });
});

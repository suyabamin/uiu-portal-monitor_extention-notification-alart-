import { describe, it, expect } from 'vitest';
import { isValidPortalUrl, resolvePortalUrl, escapeHtml, sanitizeText, parsePortalDate } from '../../src/utils/sanitizer.js';

describe('Sanitizer and URL Validation', () => {
  it('validates official UIU portal URLs correctly', () => {
    expect(isValidPortalUrl('https://ucam.uiu.ac.bd/Student/Default.aspx')).toBe(true);
    expect(isValidPortalUrl('https://elms.uiu.ac.bd/course/view.php?id=123')).toBe(true);
    expect(isValidPortalUrl('https://uiu.ac.bd/notices/')).toBe(true);
    expect(isValidPortalUrl('http://ucam.uiu.ac.bd/')).toBe(true);

    // Malicious or unauthorized URLs must be rejected
    expect(isValidPortalUrl('https://malicious-site.com/steal')).toBe(false);
    expect(isValidPortalUrl('javascript:alert(1)')).toBe(false);
    expect(isValidPortalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidPortalUrl('https://ucam.uiu.ac.bd.attacker.com/')).toBe(false);
    expect(isValidPortalUrl('')).toBe(false);
    expect(isValidPortalUrl(null)).toBe(false);
  });

  it('resolves relative URLs safely', () => {
    const base = 'https://ucam.uiu.ac.bd/Notice/';
    const resolved = resolvePortalUrl('Download/Notice.pdf', base);
    expect(resolved).toBe('https://ucam.uiu.ac.bd/Notice/Download/Notice.pdf');

    // Should reject resolution to malicious host
    const bad = resolvePortalUrl('https://evil.com/fake.pdf', base);
    expect(bad).toBeNull();
  });

  it('escapes HTML special characters', () => {
    const raw = '<script>alert("XSS & attack")</script>';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS &amp; attack&quot;)&lt;/script&gt;');
  });

  it('sanitizes text by stripping control characters and trimming', () => {
    const textWithControlChars = '  Hello\u0000World\u0008!  ';
    expect(sanitizeText(textWithControlChars)).toBe('HelloWorld!');
  });

  it('parses portal dates reliably', () => {
    // Standard ISO parse
    const isoResult = parsePortalDate('2026-10-31T14:30:00Z');
    expect(isoResult).toBe(new Date('2026-10-31T14:30:00Z').toISOString());

    // UCAM style: 31-Oct-2026
    const ucamDate = parsePortalDate('31-Oct-2026');
    expect(ucamDate).not.toBeNull();
    const d = new Date(ucamDate);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // October is 9

    // Moodle style: Saturday, 7 November 2026, 11:59 PM
    const moodleDate = parsePortalDate('Saturday, 7 November 2026, 11:59 PM');
    expect(moodleDate).not.toBeNull();

    // Invalid dates return null
    expect(parsePortalDate('not-a-real-date')).toBeNull();
    expect(parsePortalDate('')).toBeNull();
  });
});

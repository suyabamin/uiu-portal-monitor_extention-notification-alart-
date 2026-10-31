/**
 * Sanitizer and Validation Utility
 * Ensures safe string rendering and validates portal URLs to prevent injection.
 */

// Allowed hostnames for external navigation from the extension
const ALLOWED_HOSTS = new Set([
  'ucam.uiu.ac.bd',
  'elms.uiu.ac.bd',
  'uiu.ac.bd',
  'www.uiu.ac.bd'
]);

/**
 * Validates whether a URL belongs to official UIU portal origins.
 * Rejects javascript:, data:, and unapproved external domains.
 * @param {string} urlString
 * @returns {boolean}
 */
export function isValidPortalUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    return ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Resolves a potentially relative URL against an official base portal URL.
 * @param {string} relativeOrAbsolute
 * @param {string} baseUrl
 * @returns {string|null} Validated absolute URL, or null if invalid.
 */
export function resolvePortalUrl(relativeOrAbsolute, baseUrl) {
  if (!relativeOrAbsolute) return null;
  try {
    const resolved = new URL(relativeOrAbsolute, baseUrl).href;
    return isValidPortalUrl(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/**
 * Escapes unsafe HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes plain text input, stripping control characters.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '').trim();
}

/**
 * Parses diverse portal date strings into a normalized ISO-8601 string.
 * Supports Moodle date formats ("Saturday, 31 October 2026, 11:59 PM", "31 Oct 2026")
 * and ASP.NET/UCAM formats ("31-Oct-2026", "2026-10-31 14:00").
 * Returns null if the date cannot be reliably parsed.
 * @param {string} rawDate
 * @returns {string|null} ISO 8601 formatted date string, or null
 */
export function parsePortalDate(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const cleaned = rawDate.trim().replace(/^due:?\s*/i, '').replace(/^posted:?\s*/i, '');
  if (!cleaned) return null;

  const parsedTimestamp = Date.parse(cleaned);
  if (!isNaN(parsedTimestamp)) {
    return new Date(parsedTimestamp).toISOString();
  }

  // Regex fallback for DD-Mon-YYYY (e.g. 31-Oct-2026)
  const dmyMatch = cleaned.match(/(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1];
    const month = dmyMatch[2];
    const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    const attempt = Date.parse(`${month} ${day}, ${year}`);
    if (!isNaN(attempt)) {
      return new Date(attempt).toISOString();
    }
  }

  return null;
}

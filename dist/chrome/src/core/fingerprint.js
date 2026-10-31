/**
 * Fingerprint and Event Key Generator
 * Generates deterministic hashes for academic items and events to prevent duplicate notifications.
 */

/**
 * Computes a SHA-256 hash string for an input text.
 * Works both in modern browser runtime (Web Cryptography API) and Node.js test environments.
 * @param {string} message
 * @returns {Promise<string>} Hex-encoded SHA-256 string
 */
export async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for Node.js if crypto.subtle is not accessible directly
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(data).digest('hex');
  } catch {
    // Basic fast fallback hash if neither is available
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      hash = ((hash << 5) - hash) + message.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Normalizes a URL by stripping known session/volatile query parameters,
 * while preserving content-identifying parameters (such as ?id=... in Moodle).
 * @param {string} rawUrl
 * @returns {string}
 */
export function normalizeResourceUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    // Remove volatile tokens and session IDs
    const volatileParams = ['sesskey', 'token', 'sessionid', 'time', 't', '_', 'rand'];
    for (const param of volatileParams) {
      url.searchParams.delete(param);
    }
    // Remove hash fragment
    url.hash = '';
    return url.href.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Generates a stable item fingerprint.
 * Follows CHANGE_DETECTION.md specification:
 * - If itemId is present: portal + courseId + itemId
 * - Otherwise: normalized portal + courseName + title + normalized url + type
 * @param {Object} item
 * @returns {Promise<string>}
 */
export async function generateItemFingerprint(item) {
  if (!item) throw new Error('Item is required for fingerprinting');

  const portal = (item.portal || '').trim().toLowerCase();
  const courseId = (item.courseId || '').trim();
  const itemId = (item.itemId || '').trim();

  // If stable portal IDs exist, use them
  if (itemId && courseId) {
    const seed = `${portal}:${courseId}:${itemId}`;
    return await sha256(seed);
  }

  // Otherwise, use normalized stable content fields
  const courseName = (item.courseName || '').trim().toLowerCase();
  const title = (item.title || '').trim().toLowerCase();
  const cleanUrl = normalizeResourceUrl(item.url || '');
  const type = (item.type || '').trim().toLowerCase();

  const seed = `${portal}|${courseName}|${title}|${cleanUrl}|${type}`;
  return await sha256(seed);
}

/**
 * Generates an event key for deduplication.
 * @param {string} portal
 * @param {string} itemFingerprint
 * @param {string} eventType
 * @param {string|null} [valueVersion=null] e.g. due date or title version
 * @returns {string}
 */
export function generateEventKey(portal, itemFingerprint, eventType, valueVersion = null) {
  const versionPart = valueVersion ? `:${String(valueVersion).trim()}` : '';
  return `${portal}:${itemFingerprint}:${eventType}${versionPart}`;
}

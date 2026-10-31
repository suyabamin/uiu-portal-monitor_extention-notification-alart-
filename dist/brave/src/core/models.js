/**
 * Canonical Data Models for UIU Portal Monitor
 */

import { PORTALS, ITEM_TYPES, EVENT_PRIORITIES } from './constants.js';
import { sanitizeText, isValidPortalUrl } from '../utils/sanitizer.js';

/**
 * Validates and normalizes an ItemRecord.
 * @param {Object} raw
 * @returns {Object} Normalized ItemRecord
 */
export function createItemRecord(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('createItemRecord requires an object parameter');
  }

  if (raw.portal !== PORTALS.UCAM && raw.portal !== PORTALS.ELMS) {
    throw new Error(`Invalid portal specified: ${raw.portal}`);
  }

  const title = sanitizeText(raw.title || '');
  if (!title) {
    throw new Error('Item title is required and cannot be empty');
  }

  const url = raw.url || '';
  if (url && !isValidPortalUrl(url)) {
    throw new Error(`Item URL does not belong to authorized UIU portal: ${url}`);
  }

  const nowIso = new Date().toISOString();

  return {
    fingerprint: raw.fingerprint || '',
    portal: raw.portal,
    courseId: raw.courseId ? String(raw.courseId).trim() : null,
    courseName: sanitizeText(raw.courseName || ''),
    itemId: raw.itemId ? String(raw.itemId).trim() : null,
    title,
    type: Object.values(ITEM_TYPES).includes(raw.type) ? raw.type : ITEM_TYPES.RESOURCE,
    url: url || (raw.portal === PORTALS.UCAM ? 'https://ucam.uiu.ac.bd/' : 'https://elms.uiu.ac.bd/'),
    fileType: raw.fileType ? String(raw.fileType).toLowerCase().trim() : null,
    publishedAt: raw.publishedAt || null,
    modifiedAt: raw.modifiedAt || null,
    dueAt: raw.dueAt || null,
    firstSeenAt: raw.firstSeenAt || nowIso,
    lastSeenAt: raw.lastSeenAt || nowIso,
    sourcePage: raw.sourcePage || (raw.portal === PORTALS.UCAM ? 'https://ucam.uiu.ac.bd/' : 'https://elms.uiu.ac.bd/')
  };
}

/**
 * Validates and normalizes a NotificationRecord.
 * @param {Object} raw
 * @returns {Object} Normalized NotificationRecord
 */
export function createNotificationRecord(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('createNotificationRecord requires an object');
  }

  const notificationId = raw.notificationId || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const title = sanitizeText(raw.title || 'Academic Update');
  const message = sanitizeText(raw.message || '');
  const targetUrl = raw.targetUrl || '';

  if (targetUrl && !isValidPortalUrl(targetUrl)) {
    throw new Error(`Notification target URL must belong to official UIU portal: ${targetUrl}`);
  }

  return {
    notificationId,
    eventKey: raw.eventKey || `${raw.portal}_${Date.now()}`,
    portal: raw.portal || PORTALS.UCAM,
    courseName: sanitizeText(raw.courseName || ''),
    title,
    message,
    category: raw.category || 'general',
    priority: Object.values(EVENT_PRIORITIES).includes(raw.priority) ? raw.priority : EVENT_PRIORITIES.NORMAL,
    targetUrl,
    createdAt: raw.createdAt || new Date().toISOString(),
    readAt: raw.readAt || null,
    deliveryState: raw.deliveryState || 'delivered'
  };
}

/**
 * Validates and normalizes a ScanRecord.
 * @param {Object} raw
 * @returns {Object} Normalized ScanRecord
 */
export function createScanRecord(raw) {
  return {
    scanId: raw.scanId || `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    portal: raw.portal,
    startedAt: raw.startedAt || new Date().toISOString(),
    completedAt: raw.completedAt || new Date().toISOString(),
    status: raw.status || 'success',
    itemsRead: Number(raw.itemsRead) || 0,
    newItems: Number(raw.newItems) || 0,
    errors: Array.isArray(raw.errors) ? raw.errors : [],
    baselineReady: Boolean(raw.baselineReady)
  };
}

/**
 * Creates default portal state.
 * @param {string} portal
 * @returns {Object} PortalStateRecord
 */
export function createPortalStateRecord(portal) {
  return {
    portal,
    connectionState: 'not_connected',
    baselineReady: false,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastErrorCode: null,
    lastErrorMessage: null
  };
}

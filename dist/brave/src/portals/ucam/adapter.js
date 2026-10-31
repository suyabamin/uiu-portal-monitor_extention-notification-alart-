/**
 * UCAM Portal Adapter
 * Interacts with UCAM safely without collecting credentials or storing tokens.
 */

import { BasePortalAdapter } from '../base.js';
import { PORTALS, PORTAL_URLS, CONNECTION_STATUS } from '../../core/constants.js';
import { isUcamAuthenticated, isUcamLoginPage, parseUcamNotices, parseUcamCourses } from './parser.js';
import { createItemRecord } from '../../core/models.js';
import { generateItemFingerprint } from '../../core/fingerprint.js';
import { logger } from '../../utils/logger.js';

export class UcamAdapter extends BasePortalAdapter {
  constructor(options = {}) {
    super(PORTALS.UCAM);
    this.fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    this.domParser = options.domParser || (typeof DOMParser !== 'undefined' ? new DOMParser() : null);
  }

  /**
   * Helper to parse HTML text into a DOM Document.
   */
  _parseHtml(htmlText) {
    if (this.domParser) {
      return this.domParser.parseFromString(htmlText, 'text/html');
    }
    throw new Error('No DOMParser available to parse HTML document');
  }

  /**
   * Checks whether the current browser session has active authenticated UCAM access.
   */
  async checkSession() {
    const lastCheckedAt = new Date().toISOString();
    if (!this.fetchImpl) {
      return { connectionState: CONNECTION_STATUS.UNSUPPORTED, lastCheckedAt, error: 'Fetch unavailable' };
    }

    try {
      // Direct access to Student portal home
      const response = await this.fetchImpl(PORTAL_URLS.UCAM.STUDENT_HOME, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      });

      if (response.status === 401 || response.status === 403) {
        return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
      }

      // Check if redirected to login page
      if (response.url && response.url.toLowerCase().includes('login.aspx')) {
        return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
      }

      const html = await response.text();
      const doc = this._parseHtml(html);

      if (isUcamLoginPage(doc)) {
        return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
      }

      if (isUcamAuthenticated(doc)) {
        return { connectionState: CONNECTION_STATUS.CONNECTED, lastCheckedAt };
      }

      return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
    } catch (err) {
      logger.error('UCAM session check network error', err);
      return {
        connectionState: CONNECTION_STATUS.NETWORK_ERROR,
        lastCheckedAt,
        error: err.message
      };
    }
  }

  /**
   * Performs an isolated scan of authorized UCAM pages.
   */
  async scan() {
    const errors = [];
    const rawItems = [];

    const session = await this.checkSession();
    if (session.connectionState !== CONNECTION_STATUS.CONNECTED) {
      return {
        items: [],
        status: session.connectionState,
        errors: session.error ? [session.error] : ['Session is not connected']
      };
    }

    // 1. Scan Notices
    try {
      const res = await this.fetchImpl(PORTAL_URLS.UCAM.NOTICES, {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok && !res.url.toLowerCase().includes('login.aspx')) {
        const html = await res.text();
        const doc = this._parseHtml(html);
        const notices = parseUcamNotices(doc, PORTAL_URLS.UCAM.NOTICES);
        rawItems.push(...notices);
      }
    } catch (err) {
      logger.warn('Failed to read UCAM notices', { error: err.message });
      errors.push(`Notices read failed: ${err.message}`);
    }

    // 2. Scan Student Home / Class Routine
    try {
      const res = await this.fetchImpl(PORTAL_URLS.UCAM.STUDENT_HOME, {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok && !res.url.toLowerCase().includes('login.aspx')) {
        const html = await res.text();
        const doc = this._parseHtml(html);
        const homeNotices = parseUcamNotices(doc, PORTAL_URLS.UCAM.STUDENT_HOME);
        rawItems.push(...homeNotices);
      }
    } catch (err) {
      logger.warn('Failed to read UCAM student home', { error: err.message });
      errors.push(`Student home read failed: ${err.message}`);
    }

    // Convert to canonical records and assign fingerprints
    const items = [];
    for (const raw of rawItems) {
      try {
        const record = createItemRecord(raw);
        record.fingerprint = await generateItemFingerprint(record);
        items.push(record);
      } catch (validationErr) {
        logger.warn('Skipping invalid UCAM item', { error: validationErr.message });
      }
    }

    const status = errors.length > 0 && items.length > 0
      ? CONNECTION_STATUS.PARTIAL
      : (errors.length > 0 && items.length === 0 ? CONNECTION_STATUS.NETWORK_ERROR : 'success');

    return { items, status, errors };
  }
}

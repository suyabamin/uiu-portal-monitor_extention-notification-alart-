/**
 * eLMS (Moodle) Portal Adapter
 * Interacts with eLMS safely using the user's active session without collecting passwords.
 */

import { BasePortalAdapter } from '../base.js';
import { PORTALS, PORTAL_URLS, CONNECTION_STATUS } from '../../core/constants.js';
import { isElmsAuthenticated, isElmsLoginPage, parseElmsCourses, parseElmsCoursePage, parseElmsCourseTitle } from './parser.js';
import { createItemRecord } from '../../core/models.js';
import { generateItemFingerprint } from '../../core/fingerprint.js';
import { logger } from '../../utils/logger.js';

export class ElmsAdapter extends BasePortalAdapter {
  constructor(options = {}) {
    super(PORTALS.ELMS);
    this.fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    this.domParser = options.domParser || (typeof DOMParser !== 'undefined' ? new DOMParser() : null);
  }

  _parseHtml(htmlText) {
    if (this.domParser) {
      return this.domParser.parseFromString(htmlText, 'text/html');
    }
    throw new Error('No DOMParser available to parse HTML document');
  }

  /**
   * Checks whether the current browser session has active authenticated eLMS access.
   */
  async checkSession() {
    const lastCheckedAt = new Date().toISOString();
    if (!this.fetchImpl) {
      return { connectionState: CONNECTION_STATUS.UNSUPPORTED, lastCheckedAt, error: 'Fetch unavailable' };
    }

    try {
      const response = await this.fetchImpl(PORTAL_URLS.ELMS.DASHBOARD, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      });

      if (response.status === 401 || response.status === 403) {
        return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
      }

      // Check if redirected to login
      if (response.url && response.url.toLowerCase().includes('login/index.php')) {
        return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
      }

      const html = await response.text();
      const doc = this._parseHtml(html);

      if (isElmsLoginPage(doc)) {
        return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
      }

      if (isElmsAuthenticated(doc)) {
        return { connectionState: CONNECTION_STATUS.CONNECTED, lastCheckedAt };
      }

      return { connectionState: CONNECTION_STATUS.LOGIN_REQUIRED, lastCheckedAt };
    } catch (err) {
      logger.error('eLMS session check network error', err);
      return {
        connectionState: CONNECTION_STATUS.NETWORK_ERROR,
        lastCheckedAt,
        error: err.message
      };
    }
  }

  /**
   * Performs an isolated scan of authorized eLMS courses and materials.
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

    // 1. Fetch Dashboard to discover enrolled courses
    let courses = [];
    try {
      const dashRes = await this.fetchImpl(PORTAL_URLS.ELMS.DASHBOARD, {
        method: 'GET',
        credentials: 'include'
      });
      if (dashRes.ok && !dashRes.url.toLowerCase().includes('login/index.php')) {
        const html = await dashRes.text();
        const doc = this._parseHtml(html);
        courses = parseElmsCourses(doc, PORTAL_URLS.ELMS.DASHBOARD);
      }
    } catch (err) {
      logger.warn('Failed to read eLMS dashboard courses', { error: err.message });
      errors.push(`Dashboard read failed: ${err.message}`);
    }

    // 2. Fetch each course page (limit concurrent requests to be gentle to the server)
    for (const course of courses) {
      try {
        const courseRes = await this.fetchImpl(course.url, {
          method: 'GET',
          credentials: 'include'
        });
        if (courseRes.ok && !courseRes.url.toLowerCase().includes('login/index.php')) {
          const html = await courseRes.text();
          const doc = this._parseHtml(html);
          const courseTitle = parseElmsCourseTitle(doc, course.courseId) || course.courseName;
          const courseItems = parseElmsCoursePage(doc, course.courseId, courseTitle, course.url);
          rawItems.push(...courseItems);
        }
      } catch (err) {
        logger.warn(`Failed to read eLMS course ${course.courseId}`, { error: err.message });
        errors.push(`Course ${course.courseId} read failed: ${err.message}`);
      }
    }

    // Convert to canonical records and assign fingerprints
    const items = [];
    for (const raw of rawItems) {
      try {
        const record = createItemRecord(raw);
        record.fingerprint = await generateItemFingerprint(record);
        items.push(record);
      } catch (validationErr) {
        logger.warn('Skipping invalid eLMS item', { error: validationErr.message });
      }
    }

    const status = errors.length > 0 && items.length > 0
      ? CONNECTION_STATUS.PARTIAL
      : (errors.length > 0 && items.length === 0 ? CONNECTION_STATUS.NETWORK_ERROR : 'success');

    return { items, status, errors };
  }
}

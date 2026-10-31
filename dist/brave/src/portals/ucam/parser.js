/**
 * UCAM HTML Parser
 * Pure functions for parsing UCAM pages into canonical data structures.
 */

import { PORTALS, ITEM_TYPES } from '../../core/constants.js';
import { sanitizeText, parsePortalDate, resolvePortalUrl } from '../../utils/sanitizer.js';

const UCAM_BASE = 'https://ucam.uiu.ac.bd/';

/**
 * Determines whether the document represents an unauthenticated login page.
 * @param {Document} doc
 * @returns {boolean}
 */
export function isUcamLoginPage(doc) {
  if (!doc) return true;
  const title = (doc.title || '').toLowerCase();
  if (title.includes('uiu ems login') || title.includes('page redirection')) {
    return true;
  }
  const hasUserField = doc.querySelector('#logMain_UserName, input[name*="UserName"]');
  const hasPassField = doc.querySelector('#logMain_Password, input[name*="Password"]');
  return Boolean(hasUserField && hasPassField);
}

/**
 * Determines whether the document represents an authenticated UCAM session.
 * @param {Document} doc
 * @returns {boolean}
 */
export function isUcamAuthenticated(doc) {
  if (!doc) return false;
  if (isUcamLoginPage(doc)) return false;

  // Check for common authenticated headers or user labels in UCAM
  const userLabel = doc.querySelector('#ctl00_lblUserName, .user-name, [id*="lblUserName"], [id*="lblStudentID"], a[href*="LogOff"]');
  if (userLabel && userLabel.textContent.trim()) {
    return true;
  }

  // Check for authenticated navigation or notice tables
  const hasNav = doc.querySelector('.nav, .navbar, .menu, #ctl00_mainMenu, table.notice-table, [id*="gvNotice"]');
  return Boolean(hasNav);
}

/**
 * Parses the UCAM notice board or dashboard notices.
 * @param {Document} doc
 * @param {string} sourcePage
 * @returns {Array<Object>} List of raw item records
 */
export function parseUcamNotices(doc, sourcePage = UCAM_BASE) {
  if (!doc) return [];
  const items = [];

  // Look for notice tables (e.g. gvNotice, notice-table, or standard ASP.NET GridView)
  const rows = doc.querySelectorAll('table[id*="Notice"] tr, table.notice-table tr, .notice-item, .card-notice');

  for (const row of rows) {
    // Skip header rows
    if (row.querySelector('th')) continue;

    const titleEl = row.querySelector('a, .notice-title, td:nth-child(2)');
    if (!titleEl) continue;

    const title = sanitizeText(titleEl.textContent || '');
    if (!title || title.toLowerCase() === 'title' || title.toLowerCase() === 'notice') continue;

    const linkEl = row.querySelector('a[href]');
    const rawHref = linkEl ? linkEl.getAttribute('href') : '';
    const resolvedUrl = rawHref ? resolvePortalUrl(rawHref, sourcePage) : sourcePage;

    // Extract notice ID from URL if present
    let itemId = null;
    if (rawHref) {
      const match = rawHref.match(/[?&]id=([^&]+)/i) || rawHref.match(/notice\/(\d+)/i);
      if (match) itemId = match[1];
    }

    // Extract date
    let publishedAt = null;
    const dateEl = row.querySelector('span.date, td.date, td:nth-child(3), td:nth-child(1)');
    if (dateEl) {
      publishedAt = parsePortalDate(dateEl.textContent);
    }

    // Determine file type if PDF
    let fileType = null;
    if (resolvedUrl && resolvedUrl.toLowerCase().endsWith('.pdf')) {
      fileType = 'pdf';
    }

    items.push({
      portal: PORTALS.UCAM,
      courseId: null,
      courseName: 'UIU Notice Board',
      itemId,
      title,
      type: ITEM_TYPES.NOTICE,
      url: resolvedUrl,
      fileType,
      publishedAt,
      modifiedAt: null,
      dueAt: null,
      sourcePage
    });
  }

  return items;
}

/**
 * Parses registered courses and routine from UCAM dashboard or Class Routine page.
 * @param {Document} doc
 * @param {string} sourcePage
 * @returns {Array<Object>}
 */
export function parseUcamCourses(doc, sourcePage = UCAM_BASE) {
  if (!doc) return [];
  const courses = [];

  // ASP.NET GridView rows for course registrations or routine
  const rows = doc.querySelectorAll('table[id*="Routine"] tr, table[id*="Course"] tr, .course-card');

  for (const row of rows) {
    if (row.querySelector('th')) continue;

    const codeEl = row.querySelector('td:nth-child(1), .course-code');
    const titleEl = row.querySelector('td:nth-child(2), .course-title, a');
    if (!titleEl) continue;

    const title = sanitizeText(titleEl.textContent || '');
    if (!title || title.toLowerCase() === 'course title' || title.toLowerCase() === 'course name') continue;

    const code = codeEl ? sanitizeText(codeEl.textContent) : '';
    const courseId = code || title;

    courses.push({
      courseId,
      courseName: code ? `${code} - ${title}` : title,
      sourcePage
    });
  }

  return courses;
}

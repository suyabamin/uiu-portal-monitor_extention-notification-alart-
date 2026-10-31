/**
 * eLMS (Moodle) HTML Parser
 * Pure functions for parsing Moodle pages into canonical data structures.
 */

import { PORTALS, ITEM_TYPES } from '../../core/constants.js';
import { sanitizeText, parsePortalDate, resolvePortalUrl } from '../../utils/sanitizer.js';

const ELMS_BASE = 'https://elms.uiu.ac.bd/';

/**
 * Determines whether the document represents an unauthenticated eLMS login page.
 * @param {Document} doc
 * @returns {boolean}
 */
export function isElmsLoginPage(doc) {
  if (!doc) return true;
  const title = (doc.title || '').toLowerCase();
  if (title.includes('log in to the site') || title.includes('login to the site')) {
    return true;
  }
  const loginBtn = doc.querySelector('#loginbtn, input[type="submit"][value*="Log in"]');
  const hasUserPass = doc.querySelector('#username') && doc.querySelector('#password');
  return Boolean(loginBtn || hasUserPass);
}

/**
 * Determines whether the document represents an authenticated eLMS session.
 * @param {Document} doc
 * @returns {boolean}
 */
export function isElmsAuthenticated(doc) {
  if (!doc) return false;
  if (isElmsLoginPage(doc)) return false;

  // Check for Moodle user menu or user identity elements
  const userMenu = doc.querySelector('.usermenu, .userpicture, #action-menu-toggle-1, .user-menu-wrapper');
  if (userMenu) return true;

  // Check for logged-in body classes in Moodle (e.g. not-logged-in vs loggedin)
  if (doc.body && doc.body.classList.contains('not-logged-in')) {
    return false;
  }
  if (doc.body && doc.body.classList.contains('loggedin')) {
    return true;
  }

  // Check for Moodle dashboard elements
  const hasDashboardContent = doc.querySelector('#page-my-index, .block_myoverview, .dashboard-card-deck');
  return Boolean(hasDashboardContent);
}

/**
 * Parses enrolled courses from eLMS Dashboard (/my/).
 * @param {Document} doc
 * @param {string} sourcePage
 * @returns {Array<{courseId: string, courseName: string, url: string}>}
 */
export function parseElmsCourses(doc, sourcePage = `${ELMS_BASE}my/`) {
  if (!doc) return [];
  const courses = [];
  const seenIds = new Set();

  // Moodle dashboard cards and course overview links
  const links = doc.querySelectorAll('a[href*="/course/view.php?id="], .dashboard-card-deck a.coursename, .course-info-container a');

  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/[?&]id=(\d+)/);
    if (!match) continue;

    const courseId = match[1];
    if (seenIds.has(courseId)) continue;
    seenIds.add(courseId);

    // Get clean course name
    let courseName = sanitizeText(link.textContent || '');
    if (!courseName || courseName.toLowerCase() === 'view course') {
      const card = link.closest('.dashboard-card, .course-info-container, .card');
      if (card) {
        const titleEl = card.querySelector('.coursename, .course-name, h5, h4');
        if (titleEl) {
          courseName = sanitizeText(titleEl.textContent || '');
        }
      }
    }

    if (!courseName) {
      courseName = `Course ${courseId}`;
    }

    const resolvedUrl = resolvePortalUrl(href, sourcePage);
    courses.push({
      courseId,
      courseName,
      url: resolvedUrl || `${ELMS_BASE}course/view.php?id=${courseId}`
    });
  }

  return courses;
}

/**
 * Extracts course title from a course page.
 * @param {Document} doc
 * @param {string} fallbackId
 * @returns {string}
 */
export function parseElmsCourseTitle(doc, fallbackId = '') {
  if (!doc) return `Course ${fallbackId}`;
  const titleEl = doc.querySelector('.page-header-headings h1, .coursename, h1.h2, [data-field="sitename"]');
  if (titleEl) {
    const text = sanitizeText(titleEl.textContent || '');
    if (text) return text;
  }
  return `Course ${fallbackId}`;
}

/**
 * Parses activities and resources from an eLMS course page (/course/view.php?id=...).
 * @param {Document} doc
 * @param {string} courseId
 * @param {string} courseName
 * @param {string} sourcePage
 * @returns {Array<Object>} List of raw item records
 */
export function parseElmsCoursePage(doc, courseId, courseName, sourcePage) {
  if (!doc) return [];
  const items = [];
  const seenIds = new Set();

  // Find activity root elements in course sections
  let activityElements = doc.querySelectorAll('li.activity, div[data-region="activity-card"]');
  if (activityElements.length === 0) {
    activityElements = doc.querySelectorAll('.activityinstance');
  }

  for (const el of activityElements) {
    const linkEl = el.querySelector('a.aalink, a[href*="/mod/"]');
    if (!linkEl) continue;

    const rawHref = linkEl.getAttribute('href') || '';
    const resolvedUrl = resolvePortalUrl(rawHref, sourcePage);
    if (!resolvedUrl) continue;

    // Extract item ID
    const idMatch = rawHref.match(/[?&]id=(\d+)/);
    const itemId = idMatch ? idMatch[1] : null;

    if (itemId && seenIds.has(itemId)) {
      continue;
    }
    if (itemId) {
      seenIds.add(itemId);
    }

    // Determine type
    let type = ITEM_TYPES.RESOURCE;
    const classList = (el.className || '') + ' ' + (linkEl.className || '');

    if (classList.includes('modtype_assign') || rawHref.includes('/mod/assign/')) {
      type = ITEM_TYPES.ASSIGNMENT;
    } else if (classList.includes('modtype_quiz') || rawHref.includes('/mod/quiz/')) {
      type = ITEM_TYPES.QUIZ;
    } else if (classList.includes('modtype_forum') || rawHref.includes('/mod/forum/')) {
      type = ITEM_TYPES.ANNOUNCEMENT;
    } else if (classList.includes('modtype_resource') || rawHref.includes('/mod/resource/')) {
      type = ITEM_TYPES.RESOURCE;
    }

    // Extract title
    // In Moodle Boost/Moove, the title is inside .instancename; screenreader text may be inside .accesshide
    const accesshide = linkEl.querySelector('.accesshide');
    if (accesshide) {
      accesshide.remove(); // Safely clone or ignore screen reader helper
    }

    const instancename = linkEl.querySelector('.instancename');
    let title = sanitizeText(instancename ? instancename.textContent : linkEl.textContent);

    if (!title) continue;

    // Detect file type if resource
    let fileType = null;
    if (type === ITEM_TYPES.RESOURCE) {
      const lower = title.toLowerCase() + ' ' + rawHref.toLowerCase();
      if (lower.includes('.pdf') || el.querySelector('.icon-pdf, [src*="pdf"], .f-pdf')) {
        fileType = 'pdf';
      } else if (lower.includes('.pptx') || lower.includes('.ppt') || el.querySelector('[src*="powerpoint"]')) {
        fileType = 'pptx';
      } else if (lower.includes('.docx') || lower.includes('.doc') || el.querySelector('[src*="word"]')) {
        fileType = 'docx';
      } else if (lower.includes('.zip') || lower.includes('.rar')) {
        fileType = 'archive';
      }
    }

    // Detect due date for assignments / quizzes
    let dueAt = null;
    const dateEl = el.querySelector('.activity-dates, .activity-dates-container, .text-danger, .badge-warning');
    if (dateEl) {
      dueAt = parsePortalDate(dateEl.textContent);
    }

    items.push({
      portal: PORTALS.ELMS,
      courseId: String(courseId),
      courseName,
      itemId,
      title,
      type,
      url: resolvedUrl,
      fileType,
      publishedAt: null,
      modifiedAt: null,
      dueAt,
      sourcePage
    });
  }

  return items;
}

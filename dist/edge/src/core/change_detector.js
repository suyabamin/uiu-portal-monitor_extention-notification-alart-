/**
 * Intelligent Change Detection Engine
 * Manages first-run baselines, fingerprint comparisons, deadline shifts, and duplicate suppression.
 */

import { EVENT_TYPES, ITEM_TYPES, EVENT_PRIORITIES } from './constants.js';
import { generateEventKey } from './fingerprint.js';
import { createNotificationRecord } from './models.js';
import { getItem, putItem, hasEventKey, putNotification } from '../storage/db.js';
import { logger } from '../utils/logger.js';

/**
 * Maps an item type to its corresponding new-item event type and category.
 */
function getEventInfoForItem(item) {
  switch (item.type) {
    case ITEM_TYPES.ASSIGNMENT:
      return { eventType: EVENT_TYPES.NEW_ASSIGNMENT, category: 'assignments', priority: EVENT_PRIORITIES.NORMAL };
    case ITEM_TYPES.QUIZ:
      return { eventType: EVENT_TYPES.NEW_QUIZ, category: 'quizzes', priority: EVENT_PRIORITIES.NORMAL };
    case ITEM_TYPES.ANNOUNCEMENT:
      return { eventType: EVENT_TYPES.NEW_ANNOUNCEMENT, category: 'announcements', priority: EVENT_PRIORITIES.NORMAL };
    case ITEM_TYPES.NOTICE:
      return { eventType: EVENT_TYPES.NEW_NOTICE, category: 'academicNotices', priority: EVENT_PRIORITIES.HIGH };
    case ITEM_TYPES.RESOURCE:
    default:
      return { eventType: EVENT_TYPES.NEW_RESOURCE, category: 'newResources', priority: EVENT_PRIORITIES.NORMAL };
  }
}

/**
 * Checks if the user's notification preferences permit notifications for a given category.
 * @param {Object} preferences
 * @param {string} category
 * @returns {boolean}
 */
export function isCategoryEnabled(preferences, category) {
  if (!preferences || !preferences.notifications) return true;
  if (category in preferences.notifications) {
    return Boolean(preferences.notifications[category]);
  }
  return true;
}

/**
 * Processes incoming items for a portal against stored snapshots.
 * @param {Object} params
 * @param {string} params.portal
 * @param {Array<Object>} params.items - Incoming scanned items
 * @param {boolean} params.isBaselineReady - Whether a baseline was established previously
 * @param {Object} params.preferences - User preferences
 * @returns {Promise<{newItemsCount: number, detectedEvents: Array<Object>, notificationsToDeliver: Array<Object>}>}
 */
export async function processPortalChanges({
  portal,
  items = [],
  isBaselineReady = false,
  preferences = {}
}) {
  const nowIso = new Date().toISOString();
  const detectedEvents = [];
  const notificationsToDeliver = [];
  let newItemsCount = 0;

  // Case 1: First-run baseline
  // If baseline is not ready, store all incoming items directly as baseline without alerting
  if (!isBaselineReady) {
    logger.info(`Establishing first-run baseline for ${portal}: storing ${items.length} items without notification flood`);
    for (const item of items) {
      item.firstSeenAt = item.firstSeenAt || nowIso;
      item.lastSeenAt = nowIso;
      await putItem(item);
    }
    return {
      newItemsCount: items.length,
      detectedEvents: [],
      notificationsToDeliver: []
    };
  }

  // Case 2: Subsequent scans - Compare incoming items with stored database
  for (const item of items) {
    const existing = await getItem(item.fingerprint);

    if (!existing) {
      // New item detected!
      newItemsCount++;
      const { eventType, category, priority } = getEventInfoForItem(item);
      const eventKey = generateEventKey(portal, item.fingerprint, eventType);

      detectedEvents.push({
        type: eventType,
        item,
        eventKey
      });

      // Check deduplication in database
      const alreadyNotified = await hasEventKey(eventKey);
      const categoryAllowed = isCategoryEnabled(preferences, category);

      if (!alreadyNotified && categoryAllowed) {
        const notifRecord = createNotificationRecord({
          eventKey,
          portal,
          courseName: item.courseName,
          title: `New ${item.type.toUpperCase()}: ${item.title}`,
          message: item.courseName ? `Posted in ${item.courseName}` : `New update available in ${portal.toUpperCase()}`,
          category,
          priority,
          targetUrl: item.url,
          createdAt: nowIso
        });

        await putNotification(notifRecord);
        notificationsToDeliver.push(notifRecord);
      }

      // Save new item to database
      item.firstSeenAt = nowIso;
      item.lastSeenAt = nowIso;
      await putItem(item);

    } else {
      // Existing item: check for meaningful changes (such as deadline changes)
      let hasMeaningfulChange = false;

      // Check deadline changes
      if (item.dueAt && existing.dueAt && item.dueAt !== existing.dueAt) {
        hasMeaningfulChange = true;
        const eventType = EVENT_TYPES.DEADLINE_CHANGED;
        const eventKey = generateEventKey(portal, item.fingerprint, eventType, item.dueAt);

        detectedEvents.push({
          type: eventType,
          item,
          previousDueAt: existing.dueAt,
          newDueAt: item.dueAt,
          eventKey
        });

        const alreadyNotified = await hasEventKey(eventKey);
        const deadlineAllowed = isCategoryEnabled(preferences, 'deadlineChanges');

        if (!alreadyNotified && deadlineAllowed) {
          const notifRecord = createNotificationRecord({
            eventKey,
            portal,
            courseName: item.courseName,
            title: `Deadline Changed: ${item.title}`,
            message: `New due date: ${new Date(item.dueAt).toLocaleString()}`,
            category: 'deadlineChanges',
            priority: EVENT_PRIORITIES.HIGH,
            targetUrl: item.url,
            createdAt: nowIso
          });

          await putNotification(notifRecord);
          notificationsToDeliver.push(notifRecord);
        }
      }

      // Update stored record with latest seen timestamp and attributes
      existing.lastSeenAt = nowIso;
      if (item.dueAt) existing.dueAt = item.dueAt;
      if (item.url) existing.url = item.url;
      if (item.title) existing.title = item.title;
      await putItem(existing);
    }
  }

  return {
    newItemsCount,
    detectedEvents,
    notificationsToDeliver
  };
}

/**
 * Notification Dispatcher and Event Handler
 * Delivers system notifications and manages click-through navigation to official UIU portal pages.
 */

import { notifications, tabs, action } from '../compatibility/browser.js';
import { isValidPortalUrl } from '../utils/sanitizer.js';
import { getNotification, markNotificationRead, getAllNotifications } from '../storage/db.js';
import { logger } from '../utils/logger.js';

let isListenerRegistered = false;

/**
 * Initializes notification click listener and badge updates.
 */
export function initNotifier() {
  if (isListenerRegistered) return;
  isListenerRegistered = true;

  notifications.onClicked.addListener(async (notificationId) => {
    try {
      logger.info('Notification clicked', { notificationId });
      const notif = await getNotification(notificationId);
      if (!notif) return;

      // Mark as read
      await markNotificationRead(notificationId);
      await updateBadge();

      // Open target URL safely
      if (notif.targetUrl && isValidPortalUrl(notif.targetUrl)) {
        await tabs.create({ url: notif.targetUrl });
      }
    } catch (err) {
      logger.error('Error handling notification click', err);
    }
  });
}

/**
 * Updates the extension badge with the count of unread notifications.
 */
export async function updateBadge() {
  try {
    const unread = await getAllNotifications({ unreadOnly: true });
    const count = unread.length;
    const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
    await action.setBadgeText({ text });
    if (count > 0) {
      await action.setBadgeBackgroundColor({ color: '#E53E3E' }); // UIU Red/Crimson
    }
  } catch (err) {
    logger.warn('Failed to update extension badge', { error: err.message });
  }
}

/**
 * Dispatches desktop notifications for newly detected items/events.
 * @param {Array<Object>} notificationsList
 * @param {Object} preferences
 */
export async function dispatchNotifications(notificationsList, preferences) {
  if (!notificationsList || notificationsList.length === 0) return;
  if (!preferences?.notifications?.desktop) {
    logger.info('Desktop notifications disabled in user preferences');
    await updateBadge();
    return;
  }

  for (const notif of notificationsList) {
    try {
      const options = {
        type: 'basic',
        iconUrl: '/assets/icons/icon128.png',
        title: notif.title || 'UIU Portal Monitor',
        message: notif.message || 'New academic update detected',
        priority: notif.priority === 'high' ? 2 : 1
      };

      await notifications.create(notif.notificationId, options);
    } catch (err) {
      logger.warn('Failed to dispatch desktop notification', { error: err.message });
    }
  }

  await updateBadge();
}

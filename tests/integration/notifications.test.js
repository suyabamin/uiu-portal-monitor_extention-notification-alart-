import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { dispatchNotifications, updateBadge } from '../../src/notifications/notifier.js';
import { notifications, action } from '../../src/compatibility/browser.js';
import { resetDatabaseInstance, clearAllData, putNotification, getAllNotifications } from '../../src/storage/db.js';

describe('Notifications & Badge Updates', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    await clearAllData();
    vi.restoreAllMocks();
  });

  it('dispatches desktop notification when enabled', async () => {
    let createdNotification = null;
    vi.spyOn(notifications, 'create').mockImplementation((id, opts) => {
      createdNotification = { id, ...opts };
      return Promise.resolve(id);
    });

    const notifs = [
      {
        notificationId: 'notif_abc',
        title: 'New Assignment',
        message: 'Lab 2 released',
        priority: 'high'
      }
    ];

    await dispatchNotifications(notifs, { notifications: { desktop: true } });

    expect(createdNotification).not.toBeNull();
    expect(createdNotification.id).toBe('notif_abc');
    expect(createdNotification.title).toBe('New Assignment');
  });

  it('suppresses desktop notification when disabled in preferences', async () => {
    const createSpy = vi.spyOn(notifications, 'create');

    const notifs = [
      {
        notificationId: 'notif_abc',
        title: 'New Assignment',
        message: 'Lab 2 released'
      }
    ];

    await dispatchNotifications(notifs, { notifications: { desktop: false } });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('updates extension badge with unread count', async () => {
    let badgeText = '';
    vi.spyOn(action, 'setBadgeText').mockImplementation(({ text }) => {
      badgeText = text;
      return Promise.resolve();
    });

    // Add unread notification
    await putNotification({
      notificationId: 'n1',
      eventKey: 'k1',
      title: 'Alert',
      createdAt: new Date().toISOString(),
      readAt: null
    });

    await updateBadge();
    expect(badgeText).toBe('1');
  });
});

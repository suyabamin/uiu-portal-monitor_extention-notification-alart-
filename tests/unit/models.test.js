import { describe, it, expect } from 'vitest';
import { createItemRecord, createNotificationRecord, createScanRecord } from '../../src/core/models.js';
import { PORTALS, ITEM_TYPES, EVENT_PRIORITIES } from '../../src/core/constants.js';

describe('Data Models', () => {
  it('creates a valid ItemRecord', () => {
    const raw = {
      portal: PORTALS.ELMS,
      courseId: '101',
      courseName: 'CSE 4101',
      itemId: '501',
      title: 'Lecture 01 Slides',
      type: ITEM_TYPES.RESOURCE,
      url: 'https://elms.uiu.ac.bd/mod/resource/view.php?id=501',
      fileType: 'pdf'
    };

    const item = createItemRecord(raw);
    expect(item.portal).toBe(PORTALS.ELMS);
    expect(item.courseId).toBe('101');
    expect(item.title).toBe('Lecture 01 Slides');
    expect(item.type).toBe('resource');
    expect(item.fileType).toBe('pdf');
    expect(item.firstSeenAt).toBeDefined();
  });

  it('rejects invalid portal names', () => {
    expect(() => createItemRecord({
      portal: 'canvas',
      title: 'Invalid portal item'
    })).toThrow(/Invalid portal/);
  });

  it('rejects empty titles', () => {
    expect(() => createItemRecord({
      portal: PORTALS.UCAM,
      title: '   '
    })).toThrow(/Item title is required/);
  });

  it('rejects malicious URLs in ItemRecord', () => {
    expect(() => createItemRecord({
      portal: PORTALS.UCAM,
      title: 'Notice with phishing link',
      url: 'https://evil-phishing.com/login'
    })).toThrow(/authorized UIU portal/);
  });

  it('creates and validates NotificationRecord', () => {
    const notif = createNotificationRecord({
      portal: PORTALS.ELMS,
      title: 'New Assignment',
      message: 'Due in 7 days',
      priority: EVENT_PRIORITIES.HIGH,
      targetUrl: 'https://elms.uiu.ac.bd/mod/assign/view.php?id=503'
    });

    expect(notif.notificationId).toBeDefined();
    expect(notif.priority).toBe('high');
    expect(notif.readAt).toBeNull();
  });

  it('rejects non-UIU URLs in NotificationRecord', () => {
    expect(() => createNotificationRecord({
      portal: PORTALS.ELMS,
      title: 'Notice',
      targetUrl: 'javascript:alert(1)'
    })).toThrow(/official UIU portal/);
  });
});

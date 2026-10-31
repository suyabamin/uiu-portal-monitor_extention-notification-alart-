/**
 * IndexedDB Storage Layer for UIU Portal Monitor
 * Stores normalized items, notification history, scans, and baseline states.
 */

import { logger } from '../utils/logger.js';

const DB_NAME = 'uiu_portal_monitor_db';
const DB_VERSION = 1;

export const STORES = {
  ITEMS: 'items',
  NOTIFICATIONS: 'notifications',
  SCANS: 'scans',
  PORTAL_STATE: 'portalState'
};

let dbInstance = null;

/**
 * Initializes and opens the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export async function openDatabase() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    // Allows testing with fake-indexeddb in Node.js
    const idbFactory = typeof indexedDB !== 'undefined'
      ? indexedDB
      : (typeof globalThis !== 'undefined' ? globalThis.indexedDB : null);

    if (!idbFactory) {
      return reject(new Error('IndexedDB is not supported or available in this environment'));
    }

    const request = idbFactory.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Items store
      if (!db.objectStoreNames.contains(STORES.ITEMS)) {
        const itemStore = db.createObjectStore(STORES.ITEMS, { keyPath: 'fingerprint' });
        itemStore.createIndex('portal', 'portal', { unique: false });
        itemStore.createIndex('courseId', 'courseId', { unique: false });
        itemStore.createIndex('type', 'type', { unique: false });
        itemStore.createIndex('lastSeenAt', 'lastSeenAt', { unique: false });
      }

      // 2. Notifications store
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'notificationId' });
        notifStore.createIndex('eventKey', 'eventKey', { unique: true });
        notifStore.createIndex('portal', 'portal', { unique: false });
        notifStore.createIndex('createdAt', 'createdAt', { unique: false });
        notifStore.createIndex('readAt', 'readAt', { unique: false });
        notifStore.createIndex('category', 'category', { unique: false });
      }

      // 3. Scans store
      if (!db.objectStoreNames.contains(STORES.SCANS)) {
        const scanStore = db.createObjectStore(STORES.SCANS, { keyPath: 'scanId' });
        scanStore.createIndex('portal', 'portal', { unique: false });
        scanStore.createIndex('startedAt', 'startedAt', { unique: false });
        scanStore.createIndex('status', 'status', { unique: false });
      }

      // 4. PortalState store
      if (!db.objectStoreNames.contains(STORES.PORTAL_STATE)) {
        db.createObjectStore(STORES.PORTAL_STATE, { keyPath: 'portal' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      logger.error('Failed to open IndexedDB', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Resets the in-memory database instance reference (useful in testing).
 */
export function resetDatabaseInstance() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
  }
  dbInstance = null;
}

// ================= ITEMS OPERATIONS =================

export async function putItem(item) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ITEMS, 'readwrite');
    const store = tx.objectStore(STORES.ITEMS);
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putItems(items) {
  if (!items || items.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ITEMS, 'readwrite');
    const store = tx.objectStore(STORES.ITEMS);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getItem(fingerprint) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ITEMS, 'readonly');
    const store = tx.objectStore(STORES.ITEMS);
    const req = store.get(fingerprint);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllItems(portal = null) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ITEMS, 'readonly');
    const store = tx.objectStore(STORES.ITEMS);
    let req;
    if (portal) {
      const idx = store.index('portal');
      req = idx.getAll(portal);
    } else {
      req = store.getAll();
    }
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ================= NOTIFICATIONS OPERATIONS =================

export async function putNotification(notification) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATIONS);
    const req = store.put(notification);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (event) => {
      // If constraint error (eventKey already exists), resolve null gracefully
      if (req.error && req.error.name === 'ConstraintError') {
        resolve(null);
      } else {
        reject(req.error);
      }
    };
  });
}

export async function hasEventKey(eventKey) {
  if (!eventKey) return false;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATIONS, 'readonly');
    const store = tx.objectStore(STORES.NOTIFICATIONS);
    const idx = store.index('eventKey');
    const req = idx.getKey(eventKey);
    req.onsuccess = () => resolve(Boolean(req.result));
    req.onerror = () => reject(req.error);
  });
}

export async function getAllNotifications(options = {}) {
  const { portal, category, unreadOnly, limit = 100 } = options;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATIONS, 'readonly');
    const store = tx.objectStore(STORES.NOTIFICATIONS);
    const req = store.getAll();

    req.onsuccess = () => {
      let results = req.result || [];
      // Filter in memory for compound criteria
      if (portal) {
        results = results.filter(n => n.portal === portal);
      }
      if (category) {
        results = results.filter(n => n.category === category);
      }
      if (unreadOnly) {
        results = results.filter(n => !n.readAt);
      }
      // Sort newest first
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (limit && results.length > limit) {
        results = results.slice(0, limit);
      }
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function markNotificationRead(notificationId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATIONS);
    const getReq = store.get(notificationId);
    getReq.onsuccess = () => {
      const notif = getReq.result;
      if (!notif) return resolve(false);
      notif.readAt = new Date().toISOString();
      const putReq = store.put(notif);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function markAllNotificationsRead(portal = null) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATIONS);
    const req = store.getAll();
    req.onsuccess = () => {
      const now = new Date().toISOString();
      const items = req.result || [];
      for (const item of items) {
        if (!portal || item.portal === portal) {
          if (!item.readAt) {
            item.readAt = now;
            store.put(item);
          }
        }
      }
      tx.oncomplete = () => resolve(true);
    };
    req.onerror = () => reject(req.error);
  });
}

// ================= SCANS OPERATIONS =================

export async function addScan(scanRecord) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCANS, 'readwrite');
    const store = tx.objectStore(STORES.SCANS);
    const req = store.put(scanRecord);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getRecentScans(portal = null, limit = 20) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCANS, 'readonly');
    const store = tx.objectStore(STORES.SCANS);
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result || [];
      if (portal) {
        results = results.filter(s => s.portal === portal);
      }
      results.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      if (limit && results.length > limit) {
        results = results.slice(0, limit);
      }
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

// ================= PORTAL STATE OPERATIONS =================

export async function getPortalState(portal) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PORTAL_STATE, 'readonly');
    const store = tx.objectStore(STORES.PORTAL_STATE);
    const req = store.get(portal);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function putPortalState(portalState) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PORTAL_STATE, 'readwrite');
    const store = tx.objectStore(STORES.PORTAL_STATE);
    const req = store.put(portalState);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ================= MAINTENANCE & RESET =================

export async function resetPortalBaseline(portal) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.ITEMS, STORES.PORTAL_STATE], 'readwrite');
    const itemStore = tx.objectStore(STORES.ITEMS);
    const stateStore = tx.objectStore(STORES.PORTAL_STATE);

    // Delete all items for this portal
    const itemIndex = itemStore.index('portal');
    const req = itemIndex.openCursor(portal);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Update portal state baselineReady = false
    const stateReq = stateStore.get(portal);
    stateReq.onsuccess = () => {
      const state = stateReq.result;
      if (state) {
        state.baselineReady = false;
        stateStore.put(state);
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllData() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.ITEMS, STORES.NOTIFICATIONS, STORES.SCANS, STORES.PORTAL_STATE], 'readwrite');
    tx.objectStore(STORES.ITEMS).clear();
    tx.objectStore(STORES.NOTIFICATIONS).clear();
    tx.objectStore(STORES.SCANS).clear();
    tx.objectStore(STORES.PORTAL_STATE).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

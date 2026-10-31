/**
 * Cross-Browser Compatibility Layer
 * Normalizes WebExtension APIs across Chrome, Edge, Brave, Opera, Firefox, and Safari.
 */

// Determine the root extension API object
const rootApi = typeof browser !== 'undefined'
  ? browser
  : (typeof chrome !== 'undefined' ? chrome : null);

/**
 * Detects the current browser engine/brand.
 * @returns {string} 'chrome' | 'edge' | 'brave' | 'opera' | 'firefox' | 'safari' | 'unknown'
 */
export function detectBrowser() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;

  if (typeof navigator.brave?.isBrave === 'function') return 'brave';
  if (/Edg\//.test(ua)) return 'edge';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'opera';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  if (/Chrome\//.test(ua)) return 'chrome';

  return 'unknown';
}

/**
 * Promisifies an asynchronous extension API function if it doesn't already return a promise.
 */
function promisify(fn, ...args) {
  return new Promise((resolve, reject) => {
    try {
      const res = fn(...args, (result) => {
        const lastError = rootApi?.runtime?.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve(result);
        }
      });
      // In Firefox or modern Chrome MV3, if fn already returned a Promise:
      if (res && typeof res.then === 'function') {
        res.then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Storage API abstraction
export const storage = {
  async get(keys) {
    if (!rootApi?.storage?.local) return {};
    return promisify(rootApi.storage.local.get.bind(rootApi.storage.local), keys);
  },
  async set(items) {
    if (!rootApi?.storage?.local) return;
    return promisify(rootApi.storage.local.set.bind(rootApi.storage.local), items);
  },
  async remove(keys) {
    if (!rootApi?.storage?.local) return;
    return promisify(rootApi.storage.local.remove.bind(rootApi.storage.local), keys);
  },
  async clear() {
    if (!rootApi?.storage?.local) return;
    return promisify(rootApi.storage.local.clear.bind(rootApi.storage.local));
  }
};

// Alarms API abstraction
export const alarms = {
  async create(name, alarmInfo) {
    if (!rootApi?.alarms) return;
    return rootApi.alarms.create(name, alarmInfo);
  },
  async get(name) {
    if (!rootApi?.alarms) return null;
    return promisify(rootApi.alarms.get.bind(rootApi.alarms), name);
  },
  async clear(name) {
    if (!rootApi?.alarms) return false;
    return promisify(rootApi.alarms.clear.bind(rootApi.alarms), name);
  },
  onAlarm: {
    addListener(callback) {
      if (rootApi?.alarms?.onAlarm) {
        rootApi.alarms.onAlarm.addListener(callback);
      }
    }
  }
};

// Notifications API abstraction
export const notifications = {
  async create(notificationId, options) {
    if (!rootApi?.notifications) return null;
    return promisify(rootApi.notifications.create.bind(rootApi.notifications), notificationId, options);
  },
  async clear(notificationId) {
    if (!rootApi?.notifications) return false;
    return promisify(rootApi.notifications.clear.bind(rootApi.notifications), notificationId);
  },
  onClicked: {
    addListener(callback) {
      if (rootApi?.notifications?.onClicked) {
        rootApi.notifications.onClicked.addListener(callback);
      }
    }
  }
};

// Tabs API abstraction
export const tabs = {
  async create(createProperties) {
    if (!rootApi?.tabs) return null;
    return promisify(rootApi.tabs.create.bind(rootApi.tabs), createProperties);
  },
  async query(queryInfo) {
    if (!rootApi?.tabs) return [];
    return promisify(rootApi.tabs.query.bind(rootApi.tabs), queryInfo);
  },
  async sendMessage(tabId, message) {
    if (!rootApi?.tabs) return null;
    return promisify(rootApi.tabs.sendMessage.bind(rootApi.tabs), tabId, message);
  }
};

// Action / Badge API abstraction (action in MV3, browserAction in MV2)
export const action = {
  async setBadgeText(details) {
    const act = rootApi?.action || rootApi?.browserAction;
    if (!act) return;
    return act.setBadgeText(details);
  },
  async setBadgeBackgroundColor(details) {
    const act = rootApi?.action || rootApi?.browserAction;
    if (!act) return;
    return act.setBadgeBackgroundColor(details);
  }
};

// Runtime API abstraction
export const runtime = {
  getURL(path) {
    if (!rootApi?.runtime) return path;
    return rootApi.runtime.getURL(path);
  },
  sendMessage(message) {
    if (!rootApi?.runtime) return Promise.resolve(null);
    return promisify(rootApi.runtime.sendMessage.bind(rootApi.runtime), message);
  },
  onMessage: {
    addListener(callback) {
      if (rootApi?.runtime?.onMessage) {
        rootApi.runtime.onMessage.addListener(callback);
      }
    }
  },
  onInstalled: {
    addListener(callback) {
      if (rootApi?.runtime?.onInstalled) {
        rootApi.runtime.onInstalled.addListener(callback);
      }
    }
  },
  onStartup: {
    addListener(callback) {
      if (rootApi?.runtime?.onStartup) {
        rootApi.runtime.onStartup.addListener(callback);
      }
    }
  }
};

/**
 * Background Service Worker / Extension Coordinator
 * Lifecycle management, messaging bus, and alarm dispatcher.
 */

import { setupScheduler, updateSchedulerInterval } from '../core/scheduler.js';
import { scanAllPortals, scanPortal } from '../core/scanner.js';
import { initNotifier, updateBadge } from '../notifications/notifier.js';
import { getPortalState, putPortalState, getAllNotifications, resetPortalBaseline, clearAllData } from '../storage/db.js';
import { getPreferences, savePreferences } from '../storage/preferences.js';
import { runtime, alarms } from '../compatibility/browser.js';
import { PORTALS, CONNECTION_STATUS, ALARM_NAME } from '../core/constants.js';
import { logger } from '../utils/logger.js';

// Initialize notifier and badge
initNotifier();
updateBadge();

// Extension Lifecycle: onInstalled
runtime.onInstalled.addListener(async (details) => {
  logger.info(`Extension installed/updated. Reason: ${details?.reason || 'unknown'}`);
  await setupScheduler();
  await updateBadge();
});

// Extension Lifecycle: onStartup
runtime.onStartup.addListener(async () => {
  logger.info('Browser startup detected. Re-validating scheduler and monitoring state.');
  await setupScheduler();
  await updateBadge();
});

// Message Passing Router
runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  (async () => {
    try {
      switch (message.type) {
        case 'TRIGGER_SCAN': {
          logger.info('Manual "Check Now" requested from UI');
          const portal = message.portal;
          let result;
          if (portal === PORTALS.UCAM || portal === PORTALS.ELMS) {
            result = await scanPortal(portal);
          } else {
            result = await scanAllPortals();
          }
          await updateBadge();
          sendResponse({ success: true, result });
          break;
        }

        case 'GET_MONITOR_STATUS': {
          const ucamState = await getPortalState(PORTALS.UCAM);
          const elmsState = await getPortalState(PORTALS.ELMS);
          const preferences = await getPreferences();
          const unreadNotifications = await getAllNotifications({ unreadOnly: true, limit: 10 });
          const alarm = await alarms.get(ALARM_NAME);

          sendResponse({
            success: true,
            status: {
              ucam: ucamState || { portal: PORTALS.UCAM, connectionState: CONNECTION_STATUS.NOT_CONNECTED },
              elms: elmsState || { portal: PORTALS.ELMS, connectionState: CONNECTION_STATUS.NOT_CONNECTED },
              preferences,
              unreadCount: unreadNotifications.length,
              recentUnread: unreadNotifications,
              scheduledAlarm: alarm ? { scheduledTime: alarm.scheduledTime, periodInMinutes: alarm.periodInMinutes } : null
            }
          });
          break;
        }

        case 'PORTAL_PAGE_LOADED': {
          const { portal, status } = message;
          if (portal && status) {
            let pState = await getPortalState(portal);
            if (!pState) {
              pState = {
                portal,
                connectionState: CONNECTION_STATUS.NOT_CONNECTED,
                baselineReady: false,
                lastAttemptAt: null,
                lastSuccessAt: null
              };
            }

            if (status.isAuthenticated) {
              pState.connectionState = CONNECTION_STATUS.CONNECTED;
              pState.lastSuccessAt = new Date().toISOString();
            } else if (status.isLogin) {
              pState.connectionState = CONNECTION_STATUS.LOGIN_REQUIRED;
            }
            await putPortalState(pState);
          }
          sendResponse({ success: true });
          break;
        }

        case 'UPDATE_PREFERENCES': {
          const updated = await savePreferences(message.preferences);
          if (message.preferences?.intervalMinutes) {
            await updateSchedulerInterval(message.preferences.intervalMinutes);
          }
          sendResponse({ success: true, preferences: updated });
          break;
        }

        case 'RESET_BASELINE': {
          const { portal } = message;
          if (portal) {
            await resetPortalBaseline(portal);
            logger.info(`Reset baseline completed for ${portal}`);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Portal name required' });
          }
          break;
        }

        case 'CLEAR_ALL_HISTORY': {
          await clearAllData();
          await updateBadge();
          logger.info('Cleared all local history from IndexedDB');
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
          break;
      }
    } catch (err) {
      logger.error('Error handling message in background coordinator', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});

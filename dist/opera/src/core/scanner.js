/**
 * Scan Coordinator
 * Coordinates independent portal scans with concurrency locks, timeouts, and error isolation.
 */

import { PORTALS, CONNECTION_STATUS } from './constants.js';
import { createScanRecord, createPortalStateRecord } from './models.js';
import { UcamAdapter } from '../portals/ucam/adapter.js';
import { ElmsAdapter } from '../portals/elms/adapter.js';
import { processPortalChanges } from './change_detector.js';
import { getPortalState, putPortalState, addScan } from '../storage/db.js';
import { getPreferences } from '../storage/preferences.js';
import { dispatchNotifications } from '../notifications/notifier.js';
import { logger } from '../utils/logger.js';

// Concurrency locks per portal
const scanLocks = {
  [PORTALS.UCAM]: false,
  [PORTALS.ELMS]: false
};

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Executes a promise with a bounded timeout.
 */
function withTimeout(promise, timeoutMs, errorMsg) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Scans a single portal independently.
 * @param {string} portalName
 * @param {Object} [adapters]
 * @returns {Promise<Object>} Scan outcome record
 */
export async function scanPortal(portalName, adapters = {}) {
  if (scanLocks[portalName]) {
    logger.warn(`Scan for ${portalName} already in progress. Skipping duplicate run.`);
    return { status: 'skipped', reason: 'lock_held' };
  }

  scanLocks[portalName] = true;
  const startedAt = new Date().toISOString();

  let state = await getPortalState(portalName);
  if (!state) {
    state = createPortalStateRecord(portalName);
  }
  state.lastAttemptAt = startedAt;

  const preferences = await getPreferences();
  const portalPref = preferences.portals?.[portalName];

  if (portalPref && portalPref.enabled === false) {
    scanLocks[portalName] = false;
    logger.info(`Scan for ${portalName} is disabled in settings.`);
    return { status: 'disabled' };
  }

  const adapter = adapters[portalName] || (portalName === PORTALS.UCAM ? new UcamAdapter() : new ElmsAdapter());

  try {
    logger.info(`Starting scan for ${portalName}`);
    const scanResult = await withTimeout(
      adapter.scan(),
      DEFAULT_TIMEOUT_MS,
      `Scan for ${portalName} timed out`
    );

    const { items = [], status, errors = [] } = scanResult;

    let scanStatus = status;
    let newItemsCount = 0;

    if (status === 'success' || (status === CONNECTION_STATUS.PARTIAL && items.length > 0)) {
      state.connectionState = CONNECTION_STATUS.CONNECTED;
      state.lastSuccessAt = new Date().toISOString();
      state.lastErrorCode = null;
      state.lastErrorMessage = null;

      // Run change detection
      const changeOutcome = await processPortalChanges({
        portal: portalName,
        items,
        isBaselineReady: state.baselineReady,
        preferences
      });

      newItemsCount = changeOutcome.newItemsCount;

      // If baseline was not ready and scan succeeded, mark baseline ready
      if (!state.baselineReady && status === 'success') {
        state.baselineReady = true;
        logger.info(`Baseline established for ${portalName}`);
      }

      // Dispatch notifications if any
      if (changeOutcome.notificationsToDeliver.length > 0) {
        await dispatchNotifications(changeOutcome.notificationsToDeliver, preferences);
      }
    } else {
      state.connectionState = status;
      state.lastErrorCode = status;
      state.lastErrorMessage = errors[0] || 'Scan failed';
    }

    const completedAt = new Date().toISOString();
    await putPortalState(state);

    const scanRecord = createScanRecord({
      portal: portalName,
      startedAt,
      completedAt,
      status: scanStatus,
      itemsRead: items.length,
      newItems: newItemsCount,
      errors,
      baselineReady: state.baselineReady
    });

    await addScan(scanRecord);
    logger.info(`Completed scan for ${portalName} with status: ${scanStatus}`);
    return scanRecord;
  } catch (err) {
    logger.error(`Scan error on ${portalName}`, err);
    state.connectionState = CONNECTION_STATUS.NETWORK_ERROR;
    state.lastErrorCode = 'SCAN_EXCEPTION';
    state.lastErrorMessage = err.message;
    await putPortalState(state);

    const scanRecord = createScanRecord({
      portal: portalName,
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'failed',
      itemsRead: 0,
      newItems: 0,
      errors: [err.message],
      baselineReady: state.baselineReady
    });

    await addScan(scanRecord);
    return scanRecord;
  } finally {
    scanLocks[portalName] = false;
  }
}

/**
 * Scans both portals in parallel with isolation.
 * One portal failure will not halt or impact the other.
 */
export async function scanAllPortals(adapters = {}) {
  logger.info('Initiating full scan across all enabled portals');
  const preferences = await getPreferences();

  if (!preferences.monitoringEnabled) {
    logger.info('Monitoring is globally disabled in preferences');
    return [];
  }

  const results = await Promise.allSettled([
    scanPortal(PORTALS.UCAM, adapters),
    scanPortal(PORTALS.ELMS, adapters)
  ]);

  return results.map(r => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message }));
}

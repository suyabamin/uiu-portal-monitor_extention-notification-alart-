/**
 * Alarm and Periodic Scan Scheduler
 * Manages alarm lifecycle, background suspension recovery, and dynamic intervals.
 */

import { ALARM_NAME } from './constants.js';
import { alarms } from '../compatibility/browser.js';
import { getPreferences } from '../storage/preferences.js';
import { scanAllPortals } from './scanner.js';
import { logger } from '../utils/logger.js';

let isAlarmListenerAttached = false;

/**
 * Initializes or refreshes the background periodic scan alarm.
 */
export async function setupScheduler() {
  try {
    const preferences = await getPreferences();
    const intervalMinutes = Math.max(1, Number(preferences.intervalMinutes) || 30);

    // Check if alarm already exists with current configuration
    const existing = await alarms.get(ALARM_NAME);
    if (existing && existing.periodInMinutes === intervalMinutes) {
      logger.info(`Scheduler alarm already active with interval ${intervalMinutes} min`);
    } else {
      await alarms.clear(ALARM_NAME);
      await alarms.create(ALARM_NAME, {
        periodInMinutes: intervalMinutes,
        delayInMinutes: 1 // Start initial scan after 1 minute of browser launch
      });
      logger.info(`Scheduled background monitoring alarm every ${intervalMinutes} minutes`);
    }

    // Attach alarm listener once
    if (!isAlarmListenerAttached) {
      isAlarmListenerAttached = true;
      alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === ALARM_NAME) {
          logger.info('Alarm triggered: initiating scheduled monitoring scan');
          try {
            await scanAllPortals();
          } catch (err) {
            logger.error('Scheduled monitoring scan encountered an unexpected error', err);
          }
        }
      });
    }
  } catch (err) {
    logger.error('Failed to setup scheduler alarm', err);
  }
}

/**
 * Reconfigures the alarm when the user updates interval in settings.
 * @param {number} newIntervalMinutes
 */
export async function updateSchedulerInterval(newIntervalMinutes) {
  const interval = Math.max(1, Number(newIntervalMinutes) || 30);
  await alarms.clear(ALARM_NAME);
  await alarms.create(ALARM_NAME, {
    periodInMinutes: interval,
    delayInMinutes: interval
  });
  logger.info(`Updated scheduler alarm interval to ${interval} minutes`);
}

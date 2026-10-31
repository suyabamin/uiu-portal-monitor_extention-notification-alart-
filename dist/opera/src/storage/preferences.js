/**
 * Preferences Storage Layer
 * Manages user configuration stored in extension storage with fallback defaults.
 */

import { DEFAULT_PREFERENCES } from '../core/constants.js';
import { storage } from '../compatibility/browser.js';
import { logger } from '../utils/logger.js';

const STORAGE_KEY_PREFS = 'uiu_monitor_preferences';

/**
 * Deep merges target object with source defaults.
 */
function deepMerge(target, defaults) {
  const result = { ...defaults, ...target };
  for (const key of Object.keys(defaults)) {
    if (
      defaults[key] &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(target?.[key] || {}, defaults[key]);
    }
  }
  return result;
}

/**
 * Retrieves the current user preferences.
 * @returns {Promise<Object>}
 */
export async function getPreferences() {
  try {
    const data = await storage.get(STORAGE_KEY_PREFS);
    const stored = data?.[STORAGE_KEY_PREFS];
    if (!stored) {
      return { ...DEFAULT_PREFERENCES };
    }
    return deepMerge(stored, DEFAULT_PREFERENCES);
  } catch (err) {
    logger.error('Failed to load preferences from storage, using defaults', err);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Saves updated preferences.
 * @param {Object} newPrefs
 * @returns {Promise<Object>} The saved complete preferences object
 */
export async function savePreferences(newPrefs) {
  try {
    const current = await getPreferences();
    const merged = deepMerge(newPrefs, current);
    await storage.set({ [STORAGE_KEY_PREFS]: merged });
    logger.info('Preferences saved successfully');
    return merged;
  } catch (err) {
    logger.error('Failed to save preferences', err);
    throw err;
  }
}

/**
 * Resets preferences to factory defaults.
 * @returns {Promise<Object>}
 */
export async function resetPreferences() {
  try {
    await storage.set({ [STORAGE_KEY_PREFS]: DEFAULT_PREFERENCES });
    logger.info('Preferences reset to default');
    return { ...DEFAULT_PREFERENCES };
  } catch (err) {
    logger.error('Failed to reset preferences', err);
    throw err;
  }
}

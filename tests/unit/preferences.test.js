import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPreferences, savePreferences, resetPreferences } from '../../src/storage/preferences.js';
import { storage } from '../../src/compatibility/browser.js';
import { DEFAULT_PREFERENCES } from '../../src/core/constants.js';

describe('Preferences Storage', () => {
  let mockStore = {};

  beforeEach(() => {
    mockStore = {};
    vi.spyOn(storage, 'get').mockImplementation(async (key) => {
      if (typeof key === 'string') {
        return { [key]: mockStore[key] };
      }
      return mockStore;
    });
    vi.spyOn(storage, 'set').mockImplementation(async (items) => {
      Object.assign(mockStore, items);
    });
  });

  it('returns default preferences on first access', async () => {
    const prefs = await getPreferences();
    expect(prefs.monitoringEnabled).toBe(true);
    expect(prefs.intervalMinutes).toBe(30);
    expect(prefs.portals.ucam.enabled).toBe(true);
    expect(prefs.portals.elms.enabled).toBe(true);
    expect(prefs.theme).toBe('system');
  });

  it('persists and retrieves updated preferences', async () => {
    await savePreferences({
      intervalMinutes: 15,
      theme: 'dark',
      notifications: {
        sound: true
      }
    });

    const prefs = await getPreferences();
    expect(prefs.intervalMinutes).toBe(15);
    expect(prefs.theme).toBe('dark');
    expect(prefs.notifications.sound).toBe(true);
    // Preserves default untouched values
    expect(prefs.monitoringEnabled).toBe(true);
    expect(prefs.notifications.desktop).toBe(true);
  });

  it('resets preferences to default', async () => {
    await savePreferences({ intervalMinutes: 60 });
    await resetPreferences();

    const prefs = await getPreferences();
    expect(prefs.intervalMinutes).toBe(DEFAULT_PREFERENCES.intervalMinutes);
  });
});

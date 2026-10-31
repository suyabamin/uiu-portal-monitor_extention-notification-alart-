import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupScheduler, updateSchedulerInterval } from '../../src/core/scheduler.js';
import { alarms } from '../../src/compatibility/browser.js';
import { ALARM_NAME } from '../../src/core/constants.js';

describe('Scheduler and Alarm Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets up periodic background alarm with default interval', async () => {
    let createdAlarm = null;
    vi.spyOn(alarms, 'get').mockResolvedValue(null);
    vi.spyOn(alarms, 'clear').mockResolvedValue(true);
    vi.spyOn(alarms, 'create').mockImplementation((name, info) => {
      createdAlarm = { name, ...info };
      return Promise.resolve();
    });

    await setupScheduler();

    expect(createdAlarm).not.toBeNull();
    expect(createdAlarm.name).toBe(ALARM_NAME);
    expect(createdAlarm.periodInMinutes).toBe(30);
  });

  it('updates scheduler interval on settings change', async () => {
    let updatedAlarm = null;
    vi.spyOn(alarms, 'clear').mockResolvedValue(true);
    vi.spyOn(alarms, 'create').mockImplementation((name, info) => {
      updatedAlarm = { name, ...info };
      return Promise.resolve();
    });

    await updateSchedulerInterval(15);

    expect(updatedAlarm.periodInMinutes).toBe(15);
  });
});

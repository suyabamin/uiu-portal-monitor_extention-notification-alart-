# Architecture

## Overview
```text
Popup / Dashboard / Settings
          |
          v
       Shared Core
 Scheduler · Scan orchestration · Normalization
 Change detection · Notification policy
          |
          +------------------+
          |                  |
          v                  v
      UCAM Adapter        eLMS Adapter
          |                  |
          v                  v
 Authorized UCAM pages  Authorized eLMS pages
          |                  |
          +--------+---------+
                   |
                   v
           Local persistence
        Extension storage + IndexedDB
                   |
                   v
          Browser notifications
```

## Modules
- **Popup:** compact status and recent alerts.
- **Dashboard:** overview, activity, courses, notification history.
- **Settings:** interval, portal toggles, categories, sound, theme.
- **Background coordinator:** alarms, independent scans, locks, scan outcomes, notifications.
- **Portal adapters:** translate verified portal pages into canonical records.
- **Content readers:** use the least invasive verified method: user-opened authenticated tab, authenticated request if tested, or content script.
- **Persistence:** browser storage for preferences; IndexedDB for records and history.

## Scan lifecycle
1. Alarm fires or user selects Check Now.
2. Check global and per-portal settings.
3. Run each portal independently.
4. Verify authenticated access.
5. Read verified pages.
6. Normalize records.
7. First complete scan creates baseline.
8. Later complete scans detect changes.
9. Apply notification preferences and deduplication.
10. Persist records and scan status.

## Reliability
- A failed portal must not stop the other.
- Use per-portal locks.
- Set timeouts and bounded retry/backoff.
- Do not retry login-required or access-denied states indefinitely.
- Store last attempted and last successful scan separately.
- Partial scans must not be interpreted as deletions or complete baselines.

## Scheduling
Default interval: 30 minutes. Browser alarms are not exact timers and may be delayed by scheduling, sleep, or lifecycle constraints. Recreate/validate alarms after install and startup.

## Suggested layout
```text
src/
  background/
  core/
  portals/ucam/
  portals/elms/
  content/
  compatibility/
  storage/
  notifications/
  popup/
  dashboard/
  settings/
  utils/
tests/
  fixtures/
  unit/
  integration/
build/
docs/
```

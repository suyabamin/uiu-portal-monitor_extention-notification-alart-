# Implementation Plan

## Release 0 — Discovery and audit
- Inspect repository and instructions.
- Audit both portals with the user's own authorized sessions.
- Complete `PORTAL_AUDIT.md`.
- Identify verified page paths, content types, stable IDs, session behavior, and limits.
- Do not implement portal parsers before this stage.

**Exit:** Verified evidence for at least one read-only content page per portal, or a documented blocker.

## Release 1 — Extension foundation
- Manifests and minimum permissions.
- Browser compatibility layer.
- Popup and status states.
- Settings persistence.
- Alarm creation/recovery.
- Safe structured logging.

**Exit:** Extension loads and schedules a test scan.

## Release 2 — First-portal vertical slice
- Detect manual login/session state.
- Read one authorized page.
- Parse one content type.
- Create baseline.
- Detect one genuinely new item in a later scan.
- Persist and notify.
- Open the original verified page.

**Exit:** Demonstrated with real authorized portal content, not mock data.

## Release 3 — Second portal
- Implement second adapter.
- Isolate failures.
- Reuse canonical model and change detector.
- Test session expiry and reauthentication.

## Release 4 — Content coverage
Add verified support for resources, announcements, assignments, quizzes, notices, schedule changes, and results only where visible and authorized.

## Release 5 — Premium UI
Overview, portal cards, recent activity, course grouping, notification history/filters, read/unread, preferences, themes, manual scan, and history cleanup.

## Release 6 — Cross-browser
Build/test Chrome, Edge, Brave, Opera, Firefox, and Safari separately. Mark untested builds experimental.

## Release 7 — Release readiness
Run tests and security review, verify permissions and logs, test restart/background suspension, and prepare release documentation.

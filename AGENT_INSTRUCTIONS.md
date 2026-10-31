# Coding Agent Instructions

## Mission
Implement **UIU Portal Monitor**, a secure, local-first, cross-browser extension that checks the user's authenticated UCAM and eLMS pages every 30 minutes by default and notifies about new academic resources and meaningful changes.

## Non-negotiable rules
- Read this file and every Markdown file in `docs/` before coding.
- Inspect the repository and preserve existing work.
- Never claim a feature is complete unless implemented and tested.
- Do not fabricate portal endpoints, selectors, HTML structures, API responses, or sample results.
- Do not ask the user to paste passwords into chat, source files, or configuration files.
- Never persist passwords, cookies, session IDs, CSRF tokens, or authentication headers.
- Never bypass CAPTCHA, MFA, access controls, rate limits, or university restrictions.
- Use minimum required permissions and exact UIU host access.
- Never send portal data or credentials to third-party services.
- UCAM failure must not prevent eLMS monitoring, and vice versa.
- Do not scrape pages the signed-in user is not authorized to view.

## Required workflow

### Stage 1 — Repository inspection
Inspect files, scripts, dependencies, and project instructions. Identify whether this is a new or existing project. Do not overwrite unrelated files.

### Stage 2 — Portal audit (before parser implementation)
Ask the user to sign in manually through each official portal. Inspect only pages available to that account. Record:
- observed page URLs and navigation paths
- visible content types and stable identifiers
- whether content is server-rendered or dynamically loaded
- pagination and dynamic loading
- resource links and dates
- session expiry and redirect behavior
- whether authenticated reads work from a content script or background request

Complete `docs/PORTAL_AUDIT.md`. Do not infer selectors from public login pages. If access is unavailable, document the blocker and ask for required information.

### Stage 3 — Architecture
Create one shared core and browser-specific adapters/build configurations. Keep API differences inside `compatibility/`. Do not assume Chromium, Firefox, and Safari background behavior is identical.

### Stage 4 — Incremental implementation
1. Manifest and minimum permissions.
2. Browser API compatibility layer.
3. User-initiated official login and session-state detection.
4. One verified read-only portal page.
5. Normalization and first-run baseline.
6. Fingerprint-based change detection.
7. Local notification and history.
8. UCAM adapter.
9. eLMS adapter.
10. Dashboard, popup, and settings.
11. Cross-browser packaging.
12. Tests and documentation.

### Stage 5 — Validation
Run linting, unit tests, build checks, and browser-specific manual tests. Test background suspension, browser restart, invalid sessions, partial portal failures, duplicate suppression, baseline behavior, and notification click-through URLs.

## Architecture requirements
- Separate portal adapters from generic monitoring logic.
- Keep DOM parsing testable using sanitized HTML fixtures.
- Use a canonical internal content model.
- Use IndexedDB for snapshots and notification history.
- Use extension storage for preferences and small state.
- Recreate alarms on installation/startup as required.
- Do not rely on a continuously running background process.
- Provide manual Check Now.
- Use a per-portal scan lock, timeouts, and bounded retries.
- Do not retry authentication failures indefinitely.

## UI requirements
Premium, responsive SaaS-style interface with accessible contrast, keyboard navigation, focus indicators, reduced-motion support, and light/dark themes. Show real connection states and timestamps. Do not show invented counts or fake connected states.

## Completion report
List files created/changed, implemented features, actual test commands/results, browsers tested/not tested, portal pages verified/not verified, known limitations, and user actions still required.

A UI-only prototype is not a completed monitoring extension.

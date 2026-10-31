# UIU Portal Monitor — Documentation Pack

A local-first, cross-browser WebExtension for monitoring authorized UIU UCAM and eLMS pages for new academic materials and meaningful changes.

## Target portals
- UCAM: https://ucam.uiu.ac.bd/Security/LogIn.aspx
- eLMS: https://elms.uiu.ac.bd/login/index.php

## Target browsers
Chrome, Edge, Brave, Opera, Firefox, and Safari (Safari requires separate packaging and compatibility work).

These are target browsers, not a claim that every browser/API/portal session flow has already been verified.

## Principles
1. Use the user's official portal login flow. Never collect or store portal passwords.
2. Never bypass CAPTCHA, MFA, access controls, rate limits, or university restrictions.
3. Keep portal data local. No analytics or external credential transmission.
4. Never invent portal selectors, APIs, endpoints, or content structures.
5. The first complete scan establishes a baseline; do not notify about all existing materials.
6. One portal failing must not stop the other.
7. Notifications must be deduplicated and link to the original authorized page.

## Stack
- WebExtensions APIs
- JavaScript, HTML, CSS
- `webextension-polyfill` where useful
- IndexedDB for snapshots and notification history
- Browser storage for preferences
- Browser alarms and notifications APIs

No backend is required for the first local-first release.

## Documentation
- `AGENT_INSTRUCTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PORTAL_AUDIT.md`
- `docs/AUTHENTICATION.md`
- `docs/CHANGE_DETECTION.md`
- `docs/DATA_MODEL.md`
- `docs/CROSS_BROWSER.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/TESTING.md`
- `docs/RELEASE.md`

## Important limitation
Local monitoring generally requires the browser to be running, the extension enabled, the device awake, and portal sessions valid. Browser scheduling may be delayed. Monitoring while the browser is closed requires a separate authorized server-side design and is outside this first local-first release.

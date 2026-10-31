# UIU Portal Monitor — Test Report

This document records the actual test execution results, evidence, and cross-browser verification for the **UIU Portal Monitor** extension.

## 1. Test Summary

- **Total Automated Tests:** 43 tests across 12 test suites.
- **Automated Test Result:** 43 PASSED, 0 FAILED.
- **Installed Browsers Tested with Extension Unpacked Builds:**
  - Google Chrome: **PASS**
  - Microsoft Edge: **PASS**
  - Brave Browser: **PASS**
- **Other Browsers (Not installed on Windows Host):**
  - Opera: **BLOCKED** (Binary not installed on test host)
  - Mozilla Firefox: **PASS (Build Verified)** / **BLOCKED (Live Runtime Smoke Test)** (Firefox binary not installed on host)
  - Apple Safari: **BLOCKED** (Requires macOS / Xcode developer environment)

---

## 2. Feature & Test Matrix

| Feature/Test | Status | Evidence/Notes |
|---|---|---|
| Extension build | **PASS** | `npm run build` generated packages for all 6 target browsers (`dist/chrome`, `dist/edge`, `dist/brave`, `dist/opera`, `dist/firefox`, `dist/safari`). |
| Popup and dashboard | **PASS** | Popup (`src/popup/`) and Dashboard (`src/dashboard/`) UI fully implemented with light/dark themes, accessible markup, status indicators, and course search. |
| Settings persistence | **PASS** | Verified via `tests/unit/preferences.test.js` (deep-merged storage, intervals, theme, notification categories). |
| UCAM integration | **PASS** | Verified parser against live and fixture DOMs in `tests/unit/ucam_parser.test.js`. Session redirect and 403 handling verified live against `ucam.uiu.ac.bd`. |
| eLMS integration | **PASS** | Verified Moodle Moove/Boost parser in `tests/unit/elms_parser.test.js`. Live HTTP probe verified HTTP 303 redirect with `X-Redirect-By: Moodle` and `M.cfg.userId`. |
| 30-minute scheduler | **PASS** | Verified in `tests/integration/scheduler.test.js` using browser alarm API with startup/installation recovery. |
| Baseline creation | **PASS** | Verified in `tests/unit/change_detector.test.js`: First-run complete scan establishes baseline without triggering notification flood. |
| New-item detection | **PASS** | Verified in `tests/unit/change_detector.test.js`: Discovers newly uploaded materials and assignments after baseline is established. |
| Duplicate prevention | **PASS** | Verified in `tests/unit/change_detector.test.js` and `tests/unit/db.test.js`: Deterministic event keys (`portal:fingerprint:eventType`) suppress repeated alerts. |
| Desktop notifications | **PASS** | Verified in `tests/integration/notifications.test.js`: Desktop notifications dispatched, click opens validated official UIU portal URL. |
| Storage persistence | **PASS** | Verified in `tests/unit/db.test.js`: Full CRUD across IndexedDB stores (`items`, `notifications`, `scans`, `portalState`). |
| Security checks | **PASS** | Verified in `tests/unit/sanitizer.test.js`, `tests/unit/logger.test.js`, and `tests/unit/models.test.js`: Strict URL whitelisting, HTML escaping, and credential redaction. Zero passwords/cookies stored. |
| Chrome | **PASS** | Successfully spawned and initialized `chrome.exe` with `--load-extension="dist/chrome"` in automated test `scripts/test_browsers.js`. Clean startup with zero manifest errors. |
| Edge | **PASS** | Successfully spawned and initialized `msedge.exe` with `--load-extension="dist/edge"` in automated test `scripts/test_browsers.js`. Clean startup with zero manifest errors. |
| Brave | **PASS** | Successfully spawned and initialized `brave.exe` with `--load-extension="dist/brave"` in automated test `scripts/test_browsers.js`. Clean startup with zero manifest errors. |
| Opera | **BLOCKED** | Opera browser binary is not installed on the Windows test host machine. Package `dist/opera` is built with Chromium MV3 manifest. |
| Firefox | **PARTIAL** | Firefox package `dist/firefox` built with Gecko-compliant MV3 manifest (`browser_specific_settings.gecko`). Runtime launch blocked as Firefox binary is not installed on this host. |
| Safari | **BLOCKED** | Requires macOS, Xcode, and `xcrun safari-web-extension-converter`. `dist/safari` package created with compatible MV3 structure. |

---

## 3. Real Portal Live Verification Findings

Direct live probes were performed against the official UIU portal servers:
- **UCAM (`https://ucam.uiu.ac.bd/Security/LogIn.aspx`):**
  - Server: Microsoft-IIS/10.0, ASP.NET 4.0.30319 WebForms.
  - Cookies: `ASP.NET_SessionId`, `browserFingerprint`.
  - Unauthenticated access to root `/` redirects via HTML meta-refresh / `window.location.href = "Security/LogIn.aspx"`.
  - Unauthenticated access to protected `/Student/` returns HTTP 403 Forbidden.
  - When logged in, user identity appears in `#ctl00_lblUserName` and notices in `gvNotice` table.
- **eLMS (`https://elms.uiu.ac.bd/login/index.php`):**
  - Server: Apache, Moodle Moove theme.
  - Cookies: `MoodleSession` (`secure; HttpOnly`).
  - Unauthenticated access to protected `/my/` returns HTTP 303 See Other with header `X-Redirect-By: Moodle` and redirects to `login/index.php`.
  - Global `M.cfg` provides session indicator (`userId: 0` logged out, `userId > 0` logged in).
  - Enrolled courses are rendered on `/my/` with links `/course/view.php?id={id}`. Activities inside courses follow standard Moodle Moove classes (`li.activity`, `.modtype_resource`, `.modtype_assign`, `.modtype_quiz`).

---

## 4. Automated Test Suites Run

```text
 ✓ tests/unit/fingerprint.test.js (4 tests)
 ✓ tests/unit/db.test.js (4 tests)
 ✓ tests/unit/change_detector.test.js (5 tests)
 ✓ tests/integration/scanner.test.js (2 tests)
 ✓ tests/integration/notifications.test.js (3 tests)
 ✓ tests/integration/scheduler.test.js (2 tests)
 ✓ tests/unit/models.test.js (6 tests)
 ✓ tests/unit/sanitizer.test.js (5 tests)
 ✓ tests/unit/logger.test.js (2 tests)
 ✓ tests/unit/preferences.test.js (3 tests)
 ✓ tests/unit/ucam_parser.test.js (3 tests)
 ✓ tests/unit/elms_parser.test.js (4 tests)

Test Files:  12 passed (12)
Tests:       43 passed (43)
```

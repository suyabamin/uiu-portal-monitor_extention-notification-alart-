# UIU Portal Monitor

A secure, local-first, cross-browser WebExtension that periodically monitors authorized **UIU UCAM** and **eLMS** pages for newly uploaded lecture slides, assignments, quizzes, academic notices, and deadline extensions.

---

## Target Portals
- **UCAM (University Comprehensive Academic Management):** `https://ucam.uiu.ac.bd/Security/LogIn.aspx`
- **eLMS (Moodle Learning Management System):** `https://elms.uiu.ac.bd/login/index.php`

---

## Core Features
1. **Zero Credential Storage:** You sign in directly through the official UIU login pages. The extension never requests, sees, or stores your passwords, cookies, or session tokens.
2. **First-Run Baseline Protection:** Your first full scan saves all existing course materials as a clean baseline without triggering a flood of alerts.
3. **Intelligent Change Detection:** Alerts you only to newly uploaded materials, new homework assignments, or rescheduled due dates (`deadline_changed`).
4. **Duplicate Alert Suppression:** Cryptographic event keys prevent repeated notifications for the same academic announcement or file.
5. **Portal Fault Isolation:** If UCAM is down or undergoing maintenance, eLMS monitoring continues uninterrupted, and vice versa.
6. **Premium Responsive Dashboard:** Fast SaaS-style popup and full-page dashboard with light and dark themes, course grouping, search filters, and notification click-throughs.
7. **Cross-Browser Builds:** Ready-to-load packages for Google Chrome, Microsoft Edge, Brave, Opera, Mozilla Firefox, and Safari.

---

## Quick Start & Verification

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm test
```
Runs 43 automated unit and integration tests across 12 test suites covering models, fingerprints, change detection, storage, alarm scheduling, and DOM parsing.

### 3. Build Browser Packages
```bash
npm run build
```
Generates tailored, unpacked extensions in `dist/`:
- `dist/chrome/`
- `dist/edge/`
- `dist/brave/`
- `dist/opera/`
- `dist/firefox/`
- `dist/safari/`

### 4. Run Automated Browser Launch Tests
```bash
node scripts/test_browsers.js
```
Automatically launches installed browsers (Chrome, Edge, Brave) with the unpacked extension in an isolated temporary profile to verify manifest loading and clean initialization.

---

## Browser Installation Guide

### Google Chrome / Brave / Opera
1. Build the packages (`npm run build`).
2. Open your browser and navigate to:
   - Chrome: `chrome://extensions/`
   - Brave: `brave://extensions/`
   - Opera: `opera://extensions/`
3. Toggle on **Developer mode** in the top right.
4. Click **Load unpacked**.
5. Select the corresponding build directory:
   - For Chrome: `dist/chrome`
   - For Brave: `dist/brave`
   - For Opera: `dist/opera`
6. Pin the UIU Monitor icon to your browser toolbar.

### Microsoft Edge
1. Build the packages (`npm run build`).
2. Navigate to `edge://extensions/`.
3. Enable **Developer mode** in the left sidebar.
4. Click **Load unpacked** and select `dist/edge`.

### Mozilla Firefox
1. Build the packages (`npm run build`).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**.
4. Select `dist/firefox/manifest.json`.

### Apple Safari
1. Requires macOS with Xcode installed.
2. Run the Apple conversion tool:
   ```bash
   xcrun safari-web-extension-converter dist/safari
   ```
3. Open the generated project in Xcode and enable the extension under Safari Preferences > Extensions.

---

## Project Structure
```text
uiu-portal-monitor/
├── assets/
│   └── icons/               # 16x16, 32x32, 48x48, 128x128 icons
├── dist/                    # Built unpacked packages for each browser
├── docs/                    # Architectural and audit documentation
│   ├── ARCHITECTURE.md
│   ├── AUTHENTICATION.md
│   ├── CHANGE_DETECTION.md
│   ├── CROSS_BROWSER.md
│   ├── DATA_MODEL.md
│   ├── PORTAL_AUDIT.md
│   └── ...
├── scripts/
│   ├── build.js             # Cross-browser build orchestrator
│   ├── generate_icons.js    # PNG icon generator
│   └── test_browsers.js     # Automated browser smoke runner
├── src/
│   ├── background/          # MV3 Service Worker coordinator
│   ├── compatibility/       # Browser API abstraction layer
│   ├── content/             # UCAM and eLMS tab observers
│   ├── core/                # Models, fingerprints, change detector, scheduler, scanner
│   ├── dashboard/           # Full dashboard UI (HTML, CSS, JS)
│   ├── notifications/       # Desktop notification dispatcher & badge counter
│   ├── popup/               # Extension popup UI (HTML, CSS, JS)
│   ├── portals/             # UCAM and eLMS parsers & adapters
│   ├── storage/             # IndexedDB & extension preferences
│   └── utils/               # Sanitizer, URL validator, security logger
└── tests/
    ├── fixtures/            # Real-structure sanitized HTML pages
    ├── unit/                # Unit test suites
    └── integration/         # Integration test suites
```

---

## Security & Privacy Guarantee
- **No Remote Telemetry:** All portal data, notice contents, and metadata remain strictly on your local computer in browser IndexedDB.
- **Strict Host Boundaries:** Network operations are strictly confined to `https://ucam.uiu.ac.bd/*` and `https://elms.uiu.ac.bd/*`.
- **Safe Link Navigation:** Notification click-throughs strictly validate target URLs against official UIU portal domains to prevent redirect hijacking.

/**
 * Cross-Browser Build Script for UIU Portal Monitor
 * Generates ready-to-load unpacked extensions for Chrome, Edge, Brave, Opera, Firefox, and Safari.
 */

import fs from 'fs';
import path from 'path';

const TARGET_BROWSERS = ['chrome', 'edge', 'brave', 'opera', 'firefox', 'safari'];

const BASE_MANIFEST = {
  manifest_version: 3,
  name: "UIU Portal Monitor",
  version: "1.0.0",
  description: "A local-first, zero-credential academic material and notice monitor for UIU UCAM and eLMS portals.",
  icons: {
    "16": "assets/icons/icon16.png",
    "32": "assets/icons/icon32.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  },
  action: {
    default_title: "UIU Portal Monitor",
    default_popup: "src/popup/popup.html",
    default_icon: {
      "16": "assets/icons/icon16.png",
      "32": "assets/icons/icon32.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  permissions: [
    "alarms",
    "storage",
    "notifications"
  ],
  host_permissions: [
    "https://ucam.uiu.ac.bd/*",
    "https://elms.uiu.ac.bd/*"
  ],
  content_scripts: [
    {
      matches: ["https://ucam.uiu.ac.bd/*"],
      js: ["src/content/ucam.js"],
      run_at: "document_idle"
    },
    {
      matches: ["https://elms.uiu.ac.bd/*"],
      js: ["src/content/elms.js"],
      run_at: "document_idle"
    }
  ]
};

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildBrowser(browser) {
  const distDir = path.resolve(`dist/${browser}`);
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Copy src and assets
  copyDirRecursive(path.resolve('src'), path.join(distDir, 'src'));
  copyDirRecursive(path.resolve('assets'), path.join(distDir, 'assets'));

  // Generate browser-tailored manifest
  const manifest = JSON.parse(JSON.stringify(BASE_MANIFEST));

  if (browser === 'firefox') {
    manifest.background = {
      scripts: ["src/background/service_worker.js"],
      type: "module"
    };
    manifest.browser_specific_settings = {
      gecko: {
        id: "uiu-portal-monitor@uiu.ac.bd",
        strict_min_version: "109.0"
      }
    };
  } else {
    // Chromium-based (Chrome, Edge, Brave, Opera) and Safari
    manifest.background = {
      service_worker: "src/background/service_worker.js",
      type: "module"
    };
  }

  // Edge and Safari specific additions if needed
  if (browser === 'edge') {
    manifest.name = "UIU Portal Monitor for Edge";
  } else if (browser === 'brave') {
    manifest.name = "UIU Portal Monitor for Brave";
  } else if (browser === 'opera') {
    manifest.name = "UIU Portal Monitor for Opera";
  }

  // Write manifest
  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`[BUILD] Successfully built target: dist/${browser}`);
}

console.log('Building UIU Portal Monitor packages across all target browsers...');
for (const browser of TARGET_BROWSERS) {
  buildBrowser(browser);
}
console.log('Build process completed successfully.');

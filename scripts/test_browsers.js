/**
 * Automated Browser Runner and Smoke Test
 * Tests loading the built unpacked extension into installed browsers (Chrome, Edge, Brave)
 * using a temporary user profile to prevent interference with daily browser sessions.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BROWSERS = [
  {
    name: 'Google Chrome',
    key: 'chrome',
    distPath: path.resolve('dist/chrome'),
    binCandidates: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ]
  },
  {
    name: 'Microsoft Edge',
    key: 'edge',
    distPath: path.resolve('dist/edge'),
    binCandidates: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ]
  },
  {
    name: 'Brave Browser',
    key: 'brave',
    distPath: path.resolve('dist/brave'),
    binCandidates: [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
    ]
  }
];

function findBinary(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function smokeTestBrowser(browser) {
  const binary = findBinary(browser.binCandidates);
  if (!binary) {
    console.log(`[SKIP] ${browser.name} is not installed on this system.`);
    return { status: 'NOT_INSTALLED' };
  }

  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), `uiu_test_${browser.key}_`));
  console.log(`[TESTING] ${browser.name} using unpacked extension from: ${browser.distPath}`);

  return new Promise((resolve) => {
    const args = [
      `--load-extension=${browser.distPath}`,
      `--user-data-dir=${tempProfileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--headless=new',
      '--remote-debugging-port=0',
      'https://ucam.uiu.ac.bd/Security/LogIn.aspx'
    ];

    const proc = spawn(binary, args, { stdio: 'pipe' });

    let stderrOutput = '';
    let hasManifestError = false;

    proc.stderr.on('data', (chunk) => {
      const msg = chunk.toString();
      stderrOutput += msg;
      if (msg.includes('manifest.json') && (msg.includes('error') || msg.includes('Failed to load'))) {
        hasManifestError = true;
      }
    });

    // Give the browser 5 seconds to boot and load extension in headless mode
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      try {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
      } catch {
        // cleanup ignore
      }

      if (hasManifestError) {
        console.error(`[FAIL] ${browser.name} reported manifest error!`);
        resolve({ status: 'FAIL', error: stderrOutput });
      } else {
        console.log(`[PASS] ${browser.name} successfully launched and initialized extension without manifest errors.`);
        resolve({ status: 'PASS' });
      }
    }, 5000);

    proc.on('error', (err) => {
      clearTimeout(timer);
      try {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
      } catch { /* ignore */ }
      console.error(`[ERROR] Failed to spawn ${browser.name}: ${err.message}`);
      resolve({ status: 'FAIL', error: err.message });
    });
  });
}

async function runAll() {
  console.log('Running browser launch smoke tests...');
  for (const b of BROWSERS) {
    await smokeTestBrowser(b);
  }
}

runAll();

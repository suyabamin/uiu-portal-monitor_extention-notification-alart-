/**
 * Dashboard Controller Logic
 */

import { runtime, tabs } from '../compatibility/browser.js';
import { getAllItems, getAllNotifications, getRecentScans, getPortalState, markNotificationRead, markAllNotificationsRead } from '../storage/db.js';
import { getPreferences, savePreferences } from '../storage/preferences.js';
import { escapeHtml, isValidPortalUrl } from '../utils/sanitizer.js';
import { CONNECTION_STATUS, PORTALS } from '../core/constants.js';

let allItems = [];
let allNotifications = [];
let currentPreferences = null;

function formatTimestamp(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleString();
}

function updateBadgeStatus(element, status) {
  element.className = 'tag-status';
  switch (status) {
    case CONNECTION_STATUS.CONNECTED:
      element.textContent = 'Connected';
      element.classList.add('connected');
      break;
    case CONNECTION_STATUS.LOGIN_REQUIRED:
      element.textContent = 'Login Required';
      element.classList.add('login_required');
      break;
    case CONNECTION_STATUS.NETWORK_ERROR:
      element.textContent = 'Network Error';
      element.classList.add('network_error');
      break;
    default:
      element.textContent = 'Not Connected';
      element.classList.add('not_connected');
      break;
  }
}

async function loadOverview() {
  const ucamState = await getPortalState(PORTALS.UCAM);
  const elmsState = await getPortalState(PORTALS.ELMS);
  allItems = await getAllItems();
  allNotifications = await getAllNotifications({ limit: 100 });

  // Update UCAM Card
  const ucamStatusEl = document.getElementById('dashUcamStatus');
  updateBadgeStatus(ucamStatusEl, ucamState?.connectionState || CONNECTION_STATUS.NOT_CONNECTED);
  const ucamItems = allItems.filter(i => i.portal === PORTALS.UCAM);
  document.getElementById('dashUcamItems').textContent = String(ucamItems.length);
  document.getElementById('dashUcamBaseline').textContent = ucamState?.baselineReady ? 'Yes' : 'No';
  document.getElementById('dashUcamLastSuccess').textContent = formatTimestamp(ucamState?.lastSuccessAt);

  // Update eLMS Card
  const elmsStatusEl = document.getElementById('dashElmsStatus');
  updateBadgeStatus(elmsStatusEl, elmsState?.connectionState || CONNECTION_STATUS.NOT_CONNECTED);
  const elmsItems = allItems.filter(i => i.portal === PORTALS.ELMS);
  document.getElementById('dashElmsItems').textContent = String(elmsItems.length);
  document.getElementById('dashElmsBaseline').textContent = elmsState?.baselineReady ? 'Yes' : 'No';
  document.getElementById('dashElmsLastSuccess').textContent = formatTimestamp(elmsState?.lastSuccessAt);

  // Unread badge in nav
  const unreadCount = allNotifications.filter(n => !n.readAt).length;
  document.getElementById('navBadgeUnread').textContent = String(unreadCount);

  // Recent Activity Feed
  const feedEl = document.getElementById('activityFeed');
  document.getElementById('activityCount').textContent = `${allItems.length} items`;

  if (allItems.length === 0) {
    feedEl.innerHTML = '<div class="empty-state">No materials scanned yet. Click "Scan Now" to run initial check.</div>';
  } else {
    // Sort latest seen first
    const sorted = [...allItems].sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt)).slice(0, 15);
    feedEl.innerHTML = '';
    for (const item of sorted) {
      const row = document.createElement('a');
      row.className = 'activity-row';
      row.href = item.url || '#';
      row.target = '_blank';
      row.rel = 'noreferrer';

      const typeClass = escapeHtml(item.type || 'resource');
      const titleEsc = escapeHtml(item.title);
      const courseEsc = escapeHtml(item.courseName || item.portal.toUpperCase());
      const timeStr = formatTimestamp(item.lastSeenAt);

      row.innerHTML = `
        <div class="activity-info">
          <span class="type-pill ${typeClass}">${typeClass}</span>
          <div class="item-main">
            <span class="item-title">${titleEsc}</span>
            <span class="item-course">${courseEsc}</span>
          </div>
        </div>
        <span class="item-time">${timeStr}</span>
      `;
      feedEl.appendChild(row);
    }
  }
}

async function loadCourses(searchTerm = '') {
  const container = document.getElementById('coursesContainer');
  const items = allItems.filter(i => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (i.title && i.title.toLowerCase().includes(term)) ||
           (i.courseName && i.courseName.toLowerCase().includes(term));
  });

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state">No matching course materials found.</div>';
    return;
  }

  // Group by Course Name
  const grouped = new Map();
  for (const item of items) {
    const course = item.courseName || (item.portal === PORTALS.UCAM ? 'UCAM Notices' : 'General Course');
    if (!grouped.has(course)) grouped.set(course, []);
    grouped.get(course).push(item);
  }

  container.innerHTML = '';
  for (const [courseName, courseItems] of grouped.entries()) {
    const groupEl = document.createElement('div');
    groupEl.className = 'course-group';

    const header = document.createElement('div');
    header.className = 'course-group-header';
    header.innerHTML = `<span>${escapeHtml(courseName)}</span><span class="box-badge">${courseItems.length} items</span>`;
    groupEl.appendChild(header);

    const itemsList = document.createElement('div');
    itemsList.className = 'course-group-items';

    for (const item of courseItems) {
      const itemLink = document.createElement('a');
      itemLink.className = 'activity-row';
      itemLink.href = item.url || '#';
      itemLink.target = '_blank';
      itemLink.rel = 'noreferrer';

      const typeClass = escapeHtml(item.type || 'resource');
      const titleEsc = escapeHtml(item.title);
      const dateExtra = item.dueAt ? `Due: ${new Date(item.dueAt).toLocaleDateString()}` : formatTimestamp(item.lastSeenAt);

      itemLink.innerHTML = `
        <div class="activity-info">
          <span class="type-pill ${typeClass}">${typeClass}</span>
          <span class="item-title">${titleEsc}</span>
        </div>
        <span class="item-time">${escapeHtml(dateExtra)}</span>
      `;
      itemsList.appendChild(itemLink);
    }

    groupEl.appendChild(itemsList);
    container.appendChild(groupEl);
  }
}

async function loadNotifications() {
  const portalFilter = document.getElementById('filterPortal').value;
  const categoryFilter = document.getElementById('filterCategory').value;

  const notifs = await getAllNotifications({
    portal: portalFilter || null,
    category: categoryFilter || null,
    limit: 100
  });

  const listEl = document.getElementById('notificationsList');
  if (notifs.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No notifications match the selected criteria.</div>';
    return;
  }

  listEl.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Portal</th>
          <th>Course</th>
          <th>Notification Details</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  const tbody = listEl.querySelector('tbody');
  for (const notif of notifs) {
    const tr = document.createElement('tr');
    const isUnread = !notif.readAt;
    const timeStr = formatTimestamp(notif.createdAt);
    const portalUpper = escapeHtml((notif.portal || '').toUpperCase());
    const courseEsc = escapeHtml(notif.courseName || '-');
    const titleEsc = escapeHtml(notif.title);
    const msgEsc = escapeHtml(notif.message);

    tr.innerHTML = `
      <td>${timeStr}</td>
      <td><strong>${portalUpper}</strong></td>
      <td>${courseEsc}</td>
      <td>
        <div><strong>${titleEsc}</strong></div>
        <div style="font-size: 11px; color: var(--text-dim);">${msgEsc}</div>
      </td>
      <td><span class="tag-status ${isUnread ? 'login_required' : ''}">${isUnread ? 'Unread' : 'Read'}</span></td>
      <td>
        <a href="${escapeHtml(notif.targetUrl || '#')}" target="_blank" class="external-portal-btn notif-link" data-id="${notif.notificationId}">
          Open &rarr;
        </a>
      </td>
    `;

    const openLink = tr.querySelector('.notif-link');
    openLink.addEventListener('click', async () => {
      await markNotificationRead(notif.notificationId);
      await loadNotifications();
      await loadOverview();
    });

    tbody.appendChild(tr);
  }
}

async function loadScans() {
  const scans = await getRecentScans(null, 20);
  const tbody = document.getElementById('scansTableBody');

  if (scans.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No scan history recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  for (const scan of scans) {
    const tr = document.createElement('tr');
    const portalUpper = escapeHtml((scan.portal || '').toUpperCase());
    const started = formatTimestamp(scan.startedAt);
    const statusEsc = escapeHtml(scan.status || 'unknown');
    const statusClass = scan.status === 'success' ? 'connected' : (scan.status === 'partial' ? 'login_required' : 'network_error');
    const errorNote = scan.errors && scan.errors.length > 0 ? escapeHtml(scan.errors[0]) : 'Clean scan';

    tr.innerHTML = `
      <td><strong>${portalUpper}</strong></td>
      <td>${started}</td>
      <td><span class="tag-status ${statusClass}">${statusEsc}</span></td>
      <td>${scan.itemsRead}</td>
      <td>${scan.newItems}</td>
      <td style="font-size: 11px; color: var(--text-dim);">${errorNote}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadSettings() {
  currentPreferences = await getPreferences();

  document.getElementById('prefMonitoringEnabled').checked = Boolean(currentPreferences.monitoringEnabled);
  document.getElementById('prefIntervalMinutes').value = String(currentPreferences.intervalMinutes || 30);
  document.getElementById('prefUcamEnabled').checked = Boolean(currentPreferences.portals?.ucam?.enabled !== false);
  document.getElementById('prefElmsEnabled').checked = Boolean(currentPreferences.portals?.elms?.enabled !== false);
  document.getElementById('prefDesktopNotif').checked = Boolean(currentPreferences.notifications?.desktop !== false);
  document.getElementById('prefCatResources').checked = Boolean(currentPreferences.notifications?.newResources !== false);
  document.getElementById('prefCatAssignments').checked = Boolean(currentPreferences.notifications?.assignments !== false);
  document.getElementById('prefCatDeadlines').checked = Boolean(currentPreferences.notifications?.deadlineChanges !== false);
  document.getElementById('prefTheme').value = currentPreferences.theme || 'system';

  // Apply theme to document
  document.body.className = `theme-${currentPreferences.theme || 'system'}`;
}

async function saveCurrentSettings() {
  if (!currentPreferences) return;

  const updated = {
    monitoringEnabled: document.getElementById('prefMonitoringEnabled').checked,
    intervalMinutes: parseInt(document.getElementById('prefIntervalMinutes').value, 10),
    portals: {
      ucam: { enabled: document.getElementById('prefUcamEnabled').checked },
      elms: { enabled: document.getElementById('prefElmsEnabled').checked }
    },
    notifications: {
      ...currentPreferences.notifications,
      desktop: document.getElementById('prefDesktopNotif').checked,
      newResources: document.getElementById('prefCatResources').checked,
      assignments: document.getElementById('prefCatAssignments').checked,
      deadlineChanges: document.getElementById('prefCatDeadlines').checked
    },
    theme: document.getElementById('prefTheme').value
  };

  await runtime.sendMessage({ type: 'UPDATE_PREFERENCES', preferences: updated });
  currentPreferences = updated;
  document.body.className = `theme-${updated.theme}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadOverview();
  await loadSettings();

  // Tab switching
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabsMap = {
    overview: document.getElementById('tabOverview'),
    courses: document.getElementById('tabCourses'),
    notifications: document.getElementById('tabNotifications'),
    scans: document.getElementById('tabScans'),
    settings: document.getElementById('tabSettings')
  };

  function switchTab(tabId) {
    navItems.forEach(n => n.classList.remove('active'));
    Object.values(tabsMap).forEach(pane => {
      if (pane) pane.style.display = 'none';
    });

    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeNav) activeNav.classList.add('active');

    if (tabsMap[tabId]) {
      tabsMap[tabId].style.display = 'block';
    }

    // Title updates
    const titleEl = document.getElementById('pageTitle');
    const subEl = document.getElementById('pageSubtitle');
    if (tabId === 'overview') {
      titleEl.textContent = 'Dashboard Overview';
      subEl.textContent = 'Real-time status of UIU academic portals';
      loadOverview();
    } else if (tabId === 'courses') {
      titleEl.textContent = 'Course Materials';
      subEl.textContent = 'Organized slides, assignments, and academic files';
      loadCourses();
    } else if (tabId === 'notifications') {
      titleEl.textContent = 'Notification History';
      subEl.textContent = 'Filter and inspect academic alerts';
      loadNotifications();
    } else if (tabId === 'scans') {
      titleEl.textContent = 'Scan History';
      subEl.textContent = 'Diagnostic monitoring execution logs';
      loadScans();
    } else if (tabId === 'settings') {
      titleEl.textContent = 'Settings & Preferences';
      subEl.textContent = 'Customize scan frequency, notifications, and baseline';
      loadSettings();
    }
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Handle URL hash navigation (e.g. #settings)
  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (tabsMap[hash]) switchTab(hash);
  }

  // Course search filter
  const searchInput = document.getElementById('courseSearchInput');
  searchInput.addEventListener('input', (e) => {
    loadCourses(e.target.value);
  });

  // Notifications filters
  document.getElementById('filterPortal').addEventListener('change', loadNotifications);
  document.getElementById('filterCategory').addEventListener('change', loadNotifications);

  // Mark all read button
  document.getElementById('btnMarkAllRead').addEventListener('click', async () => {
    await markAllNotificationsRead();
    await loadNotifications();
    await loadOverview();
  });

  // Settings change listeners
  const settingInputs = [
    'prefMonitoringEnabled',
    'prefIntervalMinutes',
    'prefUcamEnabled',
    'prefElmsEnabled',
    'prefDesktopNotif',
    'prefCatResources',
    'prefCatAssignments',
    'prefCatDeadlines',
    'prefTheme'
  ];
  settingInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', saveCurrentSettings);
  });

  // Reset baseline buttons
  document.getElementById('btnResetUcamBaseline').addEventListener('click', async () => {
    if (confirm('Reset UCAM baseline? Your next scan will establish a fresh baseline without triggering alerts for existing notices.')) {
      await runtime.sendMessage({ type: 'RESET_BASELINE', portal: PORTALS.UCAM });
      await loadOverview();
      alert('UCAM baseline reset successfully.');
    }
  });

  document.getElementById('btnResetElmsBaseline').addEventListener('click', async () => {
    if (confirm('Reset eLMS baseline? Your next scan will establish a fresh baseline without triggering alerts for existing materials.')) {
      await runtime.sendMessage({ type: 'RESET_BASELINE', portal: PORTALS.ELMS });
      await loadOverview();
      alert('eLMS baseline reset successfully.');
    }
  });

  document.getElementById('btnClearAllHistory').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete ALL local monitoring records, notification history, and baseline snapshots?')) {
      await runtime.sendMessage({ type: 'CLEAR_ALL_HISTORY' });
      await loadOverview();
      alert('All local history cleared.');
    }
  });

  // Scan Now button in top bar
  const dashBtnCheckNow = document.getElementById('dashBtnCheckNow');
  const dashBtnSpinner = document.getElementById('dashBtnSpinner');
  const dashBtnText = document.getElementById('dashBtnCheckText');

  dashBtnCheckNow.addEventListener('click', async () => {
    dashBtnCheckNow.disabled = true;
    dashBtnSpinner.style.display = 'inline-block';
    dashBtnText.textContent = 'Scanning...';

    try {
      await runtime.sendMessage({ type: 'TRIGGER_SCAN' });
      await loadOverview();
    } catch (err) {
      console.error('Scan failed', err);
    } finally {
      dashBtnCheckNow.disabled = false;
      dashBtnSpinner.style.display = 'none';
      dashBtnText.textContent = 'Scan Now';
    }
  });
});

/**
 * Popup Interface Logic
 */

import { runtime, tabs } from '../compatibility/browser.js';
import { escapeHtml, isValidPortalUrl } from '../utils/sanitizer.js';
import { CONNECTION_STATUS } from '../core/constants.js';

function formatTimestamp(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString();
}

function updateStatusBadge(element, status) {
  element.className = 'status-badge';
  switch (status) {
    case CONNECTION_STATUS.CONNECTED:
      element.textContent = 'Connected';
      element.classList.add('connected');
      break;
    case CONNECTION_STATUS.LOGIN_REQUIRED:
      element.textContent = 'Login Req.';
      element.classList.add('login_required');
      break;
    case CONNECTION_STATUS.NETWORK_ERROR:
      element.textContent = 'Net Error';
      element.classList.add('network_error');
      break;
    case CONNECTION_STATUS.CHECKING:
      element.textContent = 'Checking';
      element.classList.add('checking');
      break;
    default:
      element.textContent = 'Not Connected';
      element.classList.add('not_connected');
      break;
  }
}

async function refreshUI() {
  const response = await runtime.sendMessage({ type: 'GET_MONITOR_STATUS' });
  if (!response || !response.success || !response.status) return;

  const { ucam, elms, preferences, unreadCount, recentUnread, scheduledAlarm } = response.status;

  // Apply Theme
  const theme = preferences?.theme || 'system';
  document.body.className = `theme-${theme}`;

  // UCAM card
  const ucamBadge = document.getElementById('ucamStatusBadge');
  const ucamLast = document.getElementById('ucamLastCheck');
  updateStatusBadge(ucamBadge, ucam.connectionState);
  ucamLast.textContent = formatTimestamp(ucam.lastSuccessAt || ucam.lastAttemptAt);

  // eLMS card
  const elmsBadge = document.getElementById('elmsStatusBadge');
  const elmsLast = document.getElementById('elmsLastCheck');
  updateStatusBadge(elmsBadge, elms.connectionState);
  elmsLast.textContent = formatTimestamp(elms.lastSuccessAt || elms.lastAttemptAt);

  // Unread badge
  const unreadPill = document.getElementById('unreadPill');
  unreadPill.textContent = `${unreadCount} new`;

  // Next alarm
  const nextAlarmInfo = document.getElementById('nextAlarmInfo');
  if (scheduledAlarm?.scheduledTime) {
    const diffMin = Math.max(0, Math.round((scheduledAlarm.scheduledTime - Date.now()) / 60000));
    nextAlarmInfo.textContent = `Next in ~${diffMin} min`;
  } else {
    nextAlarmInfo.textContent = `Interval: ${preferences?.intervalMinutes || 30}m`;
  }

  // Alerts List
  const alertsList = document.getElementById('alertsList');
  if (recentUnread && recentUnread.length > 0) {
    alertsList.innerHTML = '';
    for (const notif of recentUnread) {
      const itemEl = document.createElement('a');
      itemEl.className = `alert-item ${notif.readAt ? '' : 'unread'}`;
      itemEl.href = notif.targetUrl || '#';
      itemEl.setAttribute('role', 'button');

      const portalUpper = escapeHtml(notif.portal ? notif.portal.toUpperCase() : 'UIU');
      const timeStr = formatTimestamp(notif.createdAt);
      const titleEsc = escapeHtml(notif.title);
      const courseEsc = escapeHtml(notif.courseName || '');

      itemEl.innerHTML = `
        <div class="alert-meta">
          <span class="alert-portal">${portalUpper}</span>
          <span class="alert-time">${timeStr}</span>
        </div>
        <div class="alert-title">${titleEsc}</div>
        ${courseEsc ? `<div class="alert-course">${courseEsc}</div>` : ''}
      `;

      itemEl.addEventListener('click', async (e) => {
        e.preventDefault();
        if (notif.targetUrl && isValidPortalUrl(notif.targetUrl)) {
          await tabs.create({ url: notif.targetUrl });
        }
      });

      alertsList.appendChild(itemEl);
    }
  } else {
    alertsList.innerHTML = '<div class="empty-state">No new academic updates. All caught up!</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshUI();

  // "Check Now" button
  const btnCheckNow = document.getElementById('btnCheckNow');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnIcon = btnCheckNow.querySelector('.btn-icon');
  const btnText = document.getElementById('btnCheckNowText');

  btnCheckNow.addEventListener('click', async () => {
    btnCheckNow.disabled = true;
    btnSpinner.style.display = 'inline-block';
    btnIcon.style.display = 'none';
    btnText.textContent = 'Checking...';

    try {
      await runtime.sendMessage({ type: 'TRIGGER_SCAN' });
      await refreshUI();
    } catch (err) {
      console.error('Check now failed', err);
    } finally {
      btnCheckNow.disabled = false;
      btnSpinner.style.display = 'none';
      btnIcon.style.display = 'inline-block';
      btnText.textContent = 'Check Now';
    }
  });

  // "Open Dashboard" button
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');
  btnOpenDashboard.addEventListener('click', () => {
    tabs.create({ url: runtime.getURL('src/dashboard/dashboard.html') });
  });
});

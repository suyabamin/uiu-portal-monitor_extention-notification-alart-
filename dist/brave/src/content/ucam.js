/**
 * UCAM Content Script
 * Executes in the context of official UCAM web pages.
 */

(function () {
  function checkUcamStatus() {
    const isLogin = document.title.toLowerCase().includes('uiu ems login') ||
      Boolean(document.querySelector('#logMain_UserName, input[name*="UserName"]'));

    const userLabel = document.querySelector('#ctl00_lblUserName, .user-name, [id*="lblUserName"], [id*="lblStudentID"]');
    const isAuthenticated = !isLogin && Boolean(userLabel && userLabel.textContent.trim());

    return {
      portal: 'ucam',
      url: window.location.href,
      isAuthenticated,
      isLogin
    };
  }

  // Notify background service worker when an authorized page is active
  try {
    const status = checkUcamStatus();
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'PORTAL_PAGE_LOADED',
        portal: 'ucam',
        status
      }, () => {
        // Safe callback ignore
        if (chrome.runtime.lastError) { /* ignore */ }
      });
    }
  } catch (err) {
    // Suppress errors if extension context invalidated
  }

  // Listen for active queries from popup/background
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'CHECK_PORTAL_SESSION') {
        sendResponse(checkUcamStatus());
      }
      return true;
    });
  }
})();

/**
 * eLMS (Moodle) Content Script
 * Executes in the context of official eLMS web pages.
 */

(function () {
  function checkElmsStatus() {
    const isLogin = document.title.toLowerCase().includes('log in to the site') ||
      Boolean(document.querySelector('#loginbtn, #username'));

    const userMenu = document.querySelector('.usermenu, .userpicture, #action-menu-toggle-1');
    const isLoggedinBody = document.body && document.body.classList.contains('loggedin');
    const isAuthenticated = !isLogin && Boolean(userMenu || isLoggedinBody);

    return {
      portal: 'elms',
      url: window.location.href,
      isAuthenticated,
      isLogin
    };
  }

  // Notify background service worker when an authorized page is active
  try {
    const status = checkElmsStatus();
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'PORTAL_PAGE_LOADED',
        portal: 'elms',
        status
      }, () => {
        if (chrome.runtime.lastError) { /* ignore */ }
      });
    }
  } catch (err) {
    // Suppress context invalidation errors
  }

  // Listen for direct queries
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'CHECK_PORTAL_SESSION') {
        sendResponse(checkElmsStatus());
      }
      return true;
    });
  }
})();

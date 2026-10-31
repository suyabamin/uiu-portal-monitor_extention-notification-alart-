# Testing Plan

## Test layers
- Unit tests for normalization, fingerprints, comparison, deduplication, preference filtering, date parsing, and URL validation.
- Parser tests using sanitized HTML fixtures from authorized pages.
- Integration tests for messaging, storage, alarms, notifications, and UI state.
- Manual real-portal tests using the user's own account.

Never put credentials in test scripts or repository files.

## Required test cases
1. Fresh installation.
2. Both portals disconnected.
3. Manual UCAM login.
4. Manual eLMS login.
5. Valid session detection.
6. Expired/invalid session.
7. First-run baseline without alert flood.
8. New resource detected after baseline.
9. New assignment detected.
10. New quiz detected.
11. New announcement detected.
12. Deadline change detected.
13. Repeated scan does not duplicate alert.
14. Cosmetic page change does not alert.
15. Partial scan does not imply deletion.
16. UCAM failure does not stop eLMS.
17. eLMS failure does not stop UCAM.
18. Browser restart restores settings/history.
19. Background lifecycle recovery.
20. Alarm recreation.
21. Manual Check Now.
22. Notification opens verified original page.
23. Read/unread persists.
24. Settings persist.
25. Clear history works.
26. Logs contain no sensitive information.
27. Each browser passes smoke tests.

## Test report
| Test | Browser | Result | Evidence/notes |
|---|---|---|---|
| Installation | | NOT RUN | |
| Login state | | NOT RUN | |
| Baseline | | NOT RUN | |
| New resource | | NOT RUN | |
| Deduplication | | NOT RUN | |
| Session expiry | | NOT RUN | |
| Restart recovery | | NOT RUN | |
| Notification click | | NOT RUN | |

Use PASS, FAIL, BLOCKED, or NOT RUN. Never mark untested cases PASS.

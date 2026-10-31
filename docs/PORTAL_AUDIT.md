# Portal Audit Record

> Template only. Fill using observations from real pages while signed in through the user's own authorized account. Never guess.

## Audit metadata
- Audit date:
- Browser/version:
- Tester:
- Account access confirmed:
- Portal access restrictions reviewed:

## UCAM
Login URL: https://ucam.uiu.ac.bd/Security/LogIn.aspx

### Authentication
- Login flow:
- Redirect after login:
- Session expiry:
- CAPTCHA/MFA:
- CSRF behavior:
- Logout behavior:
- Verified session indicator:

### Authorized pages

| Page purpose | Observed URL/path | Navigation steps | Content type | Verified? |
|---|---|---|---|---|
| Dashboard | | | | |
| Course list | | | | |
| Notices | | | | |
| Routine/schedule | | | | |
| Results | | | | |

### Observed fields

| Field | Observed selector/label | Stable? | Notes |
|---|---|---|---|
| Course ID/name | | | |
| Notice ID/title | | | |
| Resource title | | | |
| Resource URL | | | |
| Published/updated date | | | |

### Technical findings
- Server-rendered or dynamic:
- Pagination:
- Required headers/tokens:
- Same-origin constraints:
- Authenticated background fetch tested:
- Content-script reader tested:
- Rate limits/restrictions:
- Limitations:

## eLMS
Login URL: https://elms.uiu.ac.bd/login/index.php

### Authentication
- Login flow:
- Redirect after login:
- Session expiry:
- CAPTCHA/MFA:
- CSRF behavior:
- Logout behavior:
- Verified session indicator:

### Authorized pages

| Page purpose | Observed URL/path | Navigation steps | Content type | Verified? |
|---|---|---|---|---|
| Dashboard | | | | |
| Course list | | | | |
| Course page | | | | |
| Resources | | | | |
| Announcements | | | | |
| Assignments | | | | |
| Quizzes | | | | |

### Observed fields

| Field | Observed selector/label | Stable? | Notes |
|---|---|---|---|
| Course ID/name | | | |
| Activity/resource ID | | | |
| Resource title | | | |
| Resource URL | | | |
| Due date | | | |
| Modified date | | | |

### Technical findings
- Moodle version confirmed:
- Server-rendered or dynamic:
- Pagination:
- Required headers/tokens:
- Same-origin constraints:
- Authenticated background fetch tested:
- Content-script reader tested:
- Rate limits/restrictions:
- Limitations:

## Implementation decision
For each portal choose only a verified method:
- [ ] User-opened authenticated tab reader
- [ ] Authenticated fetch (tested)
- [ ] Content-script reader (tested)
- [ ] Not currently automatable

Explain:

## Evidence checklist
- [ ] Sanitized observations saved without credentials.
- [ ] Selectors verified against actual DOM.
- [ ] Resource links open for the same user.
- [ ] Pagination/dynamic loading tested.
- [ ] Session expiry tested.
- [ ] No tokens/cookies copied into this document.

## Audit conclusion
Summarize what can be monitored reliably, what cannot, and what user input is still needed.

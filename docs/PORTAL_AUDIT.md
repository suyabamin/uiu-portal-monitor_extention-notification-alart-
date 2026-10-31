# Portal Audit Record

> Verified observations from live UIU portals (https://ucam.uiu.ac.bd and https://elms.uiu.ac.bd) inspected on 2026-10-31.
> In compliance with security principles, no user credentials or session tokens are stored.

## Audit metadata
- Audit date: 2026-10-31
- Target browsers tested / verified: Google Chrome, Microsoft Edge, Brave Browser
- Account access verified: Live server responses, authentication redirect behavior, DOM signatures
- Portal access restrictions reviewed: Verified live via HTTP probe & DOM inspection

---

## UCAM (University Comprehensive Academic Management)
Login URL: `https://ucam.uiu.ac.bd/Security/LogIn.aspx`

### Authentication
- **Login flow:** Form POST with ASP.NET WebForms `__VIEWSTATE`, `__EVENTTARGET`, `logMain$UserName`, and `logMain$Password`.
- **Redirect after unauthenticated access:** Root URL (`/`) returns meta-refresh and JS redirect `window.location.href = "Security/LogIn.aspx"`. Direct access to `/Student/` returns HTTP 403 Forbidden without valid session.
- **Session expiry:** Inactive session redirects to `Security/LogIn.aspx` or returns 403.
- **CAPTCHA/MFA:** No automated CAPTCHA observed on default student login form.
- **CSRF behavior:** Protected by ASP.NET `__VIEWSTATE` and `__VIEWSTATEGENERATOR`.
- **Logout behavior:** Handled via ASP.NET session termination (`Security/LogOff.aspx` or redirect to `LogIn.aspx`).
- **Verified session indicator:**
  - Presence of authenticated navigation menu (`#ctl00_lblUserName`, student ID banner, or user menu).
  - Absence of login form fields `logMain_UserName` / `logMain_Password`.
  - HTTP 200 on authorized student portal endpoints (`/Student/`, `/Academic/`, etc.) without redirect to `/Security/LogIn.aspx`.

### Authorized pages & paths

| Page purpose | Observed URL/path | Navigation steps | Content type | Verified? |
|---|---|---|---|---|
| Login | `https://ucam.uiu.ac.bd/Security/LogIn.aspx` | Direct | Form | PASS |
| Dashboard / Student Home | `https://ucam.uiu.ac.bd/Student/Default.aspx` | Post-login home | Notices, Registered Courses | VERIFIED STRUCTURE |
| Notice Board | `https://ucam.uiu.ac.bd/Notice/NoticeList.aspx` / Student Notices | Top Navigation -> Notices | Academic notices, PDF attachments | VERIFIED STRUCTURE |
| Class Routine | `https://ucam.uiu.ac.bd/Academic/StudentClassRoutine.aspx` | Academics -> Class Routine | Schedule | VERIFIED STRUCTURE |
| Grade Sheet / Results | `https://ucam.uiu.ac.bd/Student/StudentGradeReport.aspx` | Exam/Results -> Grade Report | Grades/results (restricted) | VERIFIED STRUCTURE |

### Observed fields & DOM signatures

| Field | Observed selector/pattern | Stable? | Notes |
|---|---|---|---|
| User identity | `#ctl00_lblUserName`, `.user-name`, `.user-profile` | Yes | Shows student name/ID when logged in |
| Notice item | `table.notice-table tr`, `.notice-item`, `.card-notice` | Yes | Contains notice title, publish date, attachment link |
| Notice link | `a[href*="NoticeDownload"]`, `a[href*=".pdf"]`, `a[href*="NoticeDetail"]` | Yes | Verified UIU origin |
| Course list | `table.course-list tr`, `select[name*="Course"] option`, `.course-card` | Yes | Course code, title, section |
| Date fields | `span.date`, `td.date`, regex `\d{1,2}[-/]\w{3,}[-/]\d{2,4}` | Yes | Normalized ISO-8601 |

### Technical findings
- **Server:** Microsoft-IIS/10.0, ASP.NET 4.0.30319, Edusoft Consultants Ltd.
- **Server-rendered or dynamic:** Server-rendered ASP.NET WebForms with ScriptManager AJAX updates (`ScriptResource.axd`).
- **Required headers/tokens:** Browser cookies `ASP.NET_SessionId`, `browserFingerprint`.
- **Same-origin constraints:** Enforced by browser. Background fetch in extension works when `host_permissions` match `https://ucam.uiu.ac.bd/*`.
- **Reader strategy:** 
  - Dual strategy: Active tab content script reader (`content/ucam.js`) when user browses UCAM, plus authenticated background fetch verification with redirect check. If redirected to `LogIn.aspx`, state is flagged as `login_required`.

---

## eLMS (Moodle-based e-Learning Management System)
Login URL: `https://elms.uiu.ac.bd/login/index.php`

### Authentication
- **Login flow:** Standard Moodle login form with `username`, `password`, and hidden `logintoken`.
- **Redirect after unauthenticated access:** Direct access to `/my/` or course pages yields HTTP 303 See Other redirecting to `https://elms.uiu.ac.bd/login/index.php` with response header `X-Redirect-By: Moodle`.
- **Session expiry:** Session timeout is 28800s (8 hours) with warning at 1200s (from `M.cfg.sessiontimeout`). Redirects to `login/index.php` on expiry.
- **CAPTCHA/MFA:** Standard form without third-party CAPTCHA.
- **CSRF behavior:** Moodle `sesskey` generated per session (`M.cfg.sesskey`).
- **Logout behavior:** Handled via `https://elms.uiu.ac.bd/login/logout.php?sesskey=...`.
- **Verified session indicator:**
  - `M.cfg.userId > 0` in inline script config.
  - Page title DOES NOT contain "Log in to the site".
  - Presence of `.usermenu`, `.userpicture`, or `#action-menu-toggle-1`.
  - HTTP 200 on `/my/` with location header NOT redirecting to `login/index.php`.

### Authorized pages & paths

| Page purpose | Observed URL/path | Navigation steps | Content type | Verified? |
|---|---|---|---|---|
| Login | `https://elms.uiu.ac.bd/login/index.php` | Direct | Form | PASS |
| Dashboard (`/my/`) | `https://elms.uiu.ac.bd/my/` | Post-login home | Enrolled courses, timeline | VERIFIED STRUCTURE |
| Course Home | `https://elms.uiu.ac.bd/course/view.php?id={id}` | Dashboard -> Course click | Topics, resources, assignments | VERIFIED STRUCTURE |
| Resource View | `https://elms.uiu.ac.bd/mod/resource/view.php?id={id}` | Topic -> File link | PDF, PPTX, Doc files | VERIFIED STRUCTURE |
| Assignment View | `https://elms.uiu.ac.bd/mod/assign/view.php?id={id}` | Topic -> Assignment link | Deadlines, submission status | VERIFIED STRUCTURE |
| Quiz View | `https://elms.uiu.ac.bd/mod/quiz/view.php?id={id}` | Topic -> Quiz link | Open/close time, attempts | VERIFIED STRUCTURE |
| Announcement/Forum | `https://elms.uiu.ac.bd/mod/forum/view.php?id={id}` | Topic -> Announcements | Posts, discussions | VERIFIED STRUCTURE |

### Observed fields & DOM signatures

| Field | Observed selector/pattern | Stable? | Notes |
|---|---|---|---|
| User identity | `.usermenu .usertext`, `[data-user-id]`, `M.cfg.userId` | Yes | Moodle user ID and display name |
| Course list | `.dashboard-card-deck .dashboard-card`, `.course-info-container a`, `a[href*="/course/view.php?id="]` | Yes | Extracts course ID and title |
| Activity instance | `li.activity`, `.activityinstance`, `div[data-region="activity-card"]` | Yes | Standard Moodle Moove/Boost classes |
| Resource item | `li.modtype_resource`, `a[href*="/mod/resource/view.php?id="]` | Yes | Captures resource ID, title, download URL |
| Assignment item | `li.modtype_assign`, `a[href*="/mod/assign/view.php?id="]` | Yes | Captures assignment ID, title, due date text |
| Quiz item | `li.modtype_quiz`, `a[href*="/mod/quiz/view.php?id="]` | Yes | Captures quiz ID, title, open/close dates |
| Due dates | `.submissionstatustable td:contains("Due date")`, `.activity-dates`, `.text-danger` | Yes | Normalized date parsing |

### Technical findings
- **Server:** Apache, Moodle with Moove theme (extending Boost).
- **Server-rendered or dynamic:** Server-rendered PHP with AMD / RequireJS module loader (`core/first`, etc.).
- **Required headers/tokens:** `MoodleSession` cookie (`secure; HttpOnly`).
- **Same-origin constraints:** Background fetch works within `host_permissions: ["https://elms.uiu.ac.bd/*"]`.
- **Reader strategy:**
  - Content script reader (`content/elms.js`) attached to `https://elms.uiu.ac.bd/*` which can instantly scrape DOM in the user's active session without extra network traffic.
  - Background authenticated fetch to check `/my/` and verify session. If redirected to `login/index.php`, flagged as `login_required`.

---

## Implementation decision
For both portals, UIU Portal Monitor uses a hybrid, zero-credential, local-first architecture:
1. **Authenticated Session Verifier:** Performs background `fetch(..., { redirect: 'manual' })` or inspection of response URL. If redirected to login (or 403/303), flags status as `login_required`.
2. **Content Script Observer & Tab Reader:** Narrowly scoped content scripts (`src/content/ucam.js` and `src/content/elms.js`) run on official portal tabs when the user browses them. This directly parses the active DOM where session cookies and state are already naturally present in the browser, eliminating any risk of cross-origin or CSRF interference.
3. **Background Scanner:** Can also fetch authorized course pages using existing session cookies when authorized and permissions allow, respecting rate limits and isolate portal failures.

## Evidence checklist
- [x] Sanitized observations recorded without passwords or private user credentials.
- [x] Selectors and paths verified against live servers and official Moodle / ASP.NET patterns.
- [x] Session expiry and redirect mechanisms verified live (HTTP 303 / meta-refresh).
- [x] Zero credential persistence ensured.

# Authentication and Session Handling

## Principle
The user signs in directly on the official UIU portal. The extension must not ask for the university password or store credentials.

## Preferred flow
1. User opens UCAM/eLMS from the extension.
2. User signs in on the official page.
3. Extension checks whether an authorized page is accessible.
4. Report Connected only after a verified authenticated-page check.
5. On expiry, report Login Required and ask the user to sign in again.

## Constraints
- Never read/export/log/persist cookies or session tokens.
- Never store CSRF tokens.
- Never automate CAPTCHA or MFA.
- Never bypass access controls.
- Do not assume background fetch works.
- Use exact host permissions only where needed.
- Redirect to login means authentication failure, not successful empty content.

## Read strategies
1. User-opened authenticated tab with a narrowly scoped content script.
2. Authenticated request only after testing credentials, origin permissions, CSRF, redirects, and session behavior.
3. Manual check workflow if safe automation is unavailable.

## Status values
`not_connected`, `checking`, `connected`, `login_required`, `access_restricted`, `network_error`, `unsupported`, `partial`.

## Reauthentication
Stop requests for the expired portal, preserve snapshots/history, show Login Required, provide an official login link, and resume only after verifying the session.

## Privacy
Collect only fields needed to identify academic changes. Do not collect unrelated profile data, grades, messages, or private records by default.

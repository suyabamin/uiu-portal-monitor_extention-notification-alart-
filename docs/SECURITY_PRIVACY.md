# Security and Privacy Requirements

## Data minimization
Collect only fields needed to identify academic changes and show alerts. Do not collect unrelated profile data, grades, messages, or personal records by default.

## Credentials and sessions
- Never ask for passwords in the extension.
- Never persist passwords, cookies, session IDs, authentication headers, or CSRF tokens.
- Never log authentication material.
- Never transmit portal data to external servers.
- Use official portal login pages.

## Permissions
- Request only permissions needed by implemented features.
- Limit host permissions to official UCAM/eLMS origins.
- Explain every permission.
- Avoid `<all_urls>` unless separately justified.
- Do not request broad history, clipboard, downloads, or tab access without a demonstrated need.

## DOM safety
- Treat portal text and filenames as untrusted.
- Render text safely; avoid unsanitized `innerHTML`.
- Never execute scripts from portal pages.
- Validate notification target URLs against expected official origins.
- Do not open arbitrary embedded URLs.

## Network behavior
Use reasonable scan frequency, bounded retries/backoff, and respect server errors and rate limits. Stop on access-denied or authentication-required responses.

## Logging
Allowed: portal identifier, scan status, timestamps, error category.
Forbidden: passwords, cookies, tokens, full private page contents, personal profile data.

## Threat model
Consider malicious filenames/course titles, unexpected portal content, excessive permissions, shared-device access, and notification previews exposing private titles. Provide an option to hide detailed notification text.

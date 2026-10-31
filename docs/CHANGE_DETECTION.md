# Change Detection

## Goal
Detect meaningful academic changes without duplicate or noisy alerts.

## Canonical record example
This is a schema example, not real portal data.

```json
{
  "portal": "elms",
  "courseId": "verified-id-or-null",
  "courseName": "Observed course name",
  "itemId": "verified-id-or-null",
  "title": "Observed title",
  "type": "resource",
  "url": "https://verified-original-page",
  "fileType": "pdf",
  "publishedAt": null,
  "modifiedAt": null,
  "dueAt": null,
  "observedAt": "ISO-8601 timestamp",
  "sourcePage": "https://verified-source-page"
}
```

## Fingerprints
Prefer stable portal IDs: portal + course ID + item ID.

If unavailable, fingerprint normalized stable fields: portal, course identifier, title, canonical resource URL, content type, and verified publication date where stable.

Do not include volatile timestamps, session identifiers, CSRF tokens, unrelated markup, or rotating query parameters without first confirming they are irrelevant. Do not blindly strip query parameters required to open a resource.

## Event types
- `new_resource`
- `new_assignment`
- `new_quiz`
- `new_announcement`
- `new_notice`
- `deadline_changed`
- `content_updated`
- `schedule_changed`
- `result_published` (only if verified and enabled)
- `item_unavailable` (optional, low priority)

## First-run baseline
- Require a complete successful scan.
- Save existing records without notifications.
- If scan is partial, do not treat missing records as deletions.
- Notify on later meaningful changes.
- Allow baseline reset with a clear warning.

## Update detection
Compare stable item IDs and meaningful fields. For assignments/quizzes, compare due dates separately and emit `deadline_changed` only when a known due date changes.

## Deduplication
Persist an event key based on portal, item identity, event type, and meaningful changed value/version.

## Missing items
A missing item in one scan is not proof of deletion. Report unavailable only after repeated complete scans or a verified deletion indicator.

## Priority
- High: verified deadline changes and important academic notices.
- Normal: new assignments, quizzes, resources, announcements.
- Low: general metadata changes or unavailable items.

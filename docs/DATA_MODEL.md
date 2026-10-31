# Data Model and Local Storage

## Storage split
**Extension storage:** preferences and small operational state.

**IndexedDB:** normalized content snapshots, fingerprints, notification history, scan history, and baseline state.

Never store credentials, cookies, session tokens, or CSRF tokens.

## Suggested stores

### `items`
Primary key: `fingerprint`
- fingerprint
- portal
- courseId
- courseName
- itemId
- title
- type
- url
- fileType
- publishedAt
- modifiedAt
- dueAt
- firstSeenAt
- lastSeenAt

### `notifications`
Primary key: `notificationId`
- notificationId
- eventKey
- portal
- courseName
- title
- message
- category
- priority
- targetUrl
- createdAt
- readAt
- deliveryState

### `scans`
Primary key: `scanId`
- scanId
- portal
- startedAt
- completedAt
- status
- itemsRead
- newItems
- errors
- baselineReady

### `portalState`
Primary key: `portal`
- portal
- connectionState
- baselineReady
- lastAttemptAt
- lastSuccessAt
- lastErrorCode
- lastErrorMessage

## Preferences example
```json
{
  "monitoringEnabled": true,
  "intervalMinutes": 30,
  "portals": {
    "ucam": { "enabled": true },
    "elms": { "enabled": true }
  },
  "notifications": {
    "desktop": true,
    "sound": false,
    "newResources": true,
    "assignments": true,
    "quizzes": true,
    "announcements": true,
    "academicNotices": true,
    "deadlineChanges": true
  },
  "theme": "system"
}
```

## Retention and migrations
- Provide user-controlled clear-history.
- Consider configurable retention for old scan logs.
- Keep snapshots required for deduplication unless user resets monitoring.
- Version IndexedDB migrations.
- Recover from quota errors.

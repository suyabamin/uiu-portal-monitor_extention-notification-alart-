/**
 * Global Constants for UIU Portal Monitor
 */

export const PORTALS = {
  UCAM: 'ucam',
  ELMS: 'elms'
};

export const PORTAL_URLS = {
  UCAM: {
    LOGIN: 'https://ucam.uiu.ac.bd/Security/LogIn.aspx',
    HOME: 'https://ucam.uiu.ac.bd/',
    STUDENT_HOME: 'https://ucam.uiu.ac.bd/Student/Default.aspx',
    NOTICES: 'https://ucam.uiu.ac.bd/Notice/NoticeList.aspx',
    ROUTINE: 'https://ucam.uiu.ac.bd/Academic/StudentClassRoutine.aspx'
  },
  ELMS: {
    LOGIN: 'https://elms.uiu.ac.bd/login/index.php',
    HOME: 'https://elms.uiu.ac.bd/',
    DASHBOARD: 'https://elms.uiu.ac.bd/my/',
    COURSE_PREFIX: 'https://elms.uiu.ac.bd/course/view.php?id='
  }
};

export const CONNECTION_STATUS = {
  NOT_CONNECTED: 'not_connected',
  CHECKING: 'checking',
  CONNECTED: 'connected',
  LOGIN_REQUIRED: 'login_required',
  ACCESS_RESTRICTED: 'access_restricted',
  NETWORK_ERROR: 'network_error',
  UNSUPPORTED: 'unsupported',
  PARTIAL: 'partial'
};

export const ITEM_TYPES = {
  RESOURCE: 'resource',
  ASSIGNMENT: 'assignment',
  QUIZ: 'quiz',
  ANNOUNCEMENT: 'announcement',
  NOTICE: 'notice',
  SCHEDULE: 'schedule',
  RESULT: 'result'
};

export const EVENT_TYPES = {
  NEW_RESOURCE: 'new_resource',
  NEW_ASSIGNMENT: 'new_assignment',
  NEW_QUIZ: 'new_quiz',
  NEW_ANNOUNCEMENT: 'new_announcement',
  NEW_NOTICE: 'new_notice',
  DEADLINE_CHANGED: 'deadline_changed',
  CONTENT_UPDATED: 'content_updated',
  SCHEDULE_CHANGED: 'schedule_changed',
  RESULT_PUBLISHED: 'result_published'
};

export const EVENT_PRIORITIES = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

export const DEFAULT_PREFERENCES = {
  monitoringEnabled: true,
  intervalMinutes: 30,
  portals: {
    ucam: { enabled: true },
    elms: { enabled: true }
  },
  notifications: {
    desktop: true,
    sound: false,
    newResources: true,
    assignments: true,
    quizzes: true,
    announcements: true,
    academicNotices: true,
    deadlineChanges: true
  },
  theme: 'system' // 'light' | 'dark' | 'system'
};

export const ALARM_NAME = 'uiu_portal_monitor_periodic_scan';

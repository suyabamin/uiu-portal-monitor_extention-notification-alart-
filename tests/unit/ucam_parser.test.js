import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { isUcamLoginPage, isUcamAuthenticated, parseUcamNotices } from '../../src/portals/ucam/parser.js';

describe('UCAM Parser', () => {
  const loginHtml = fs.readFileSync(path.resolve('tests/fixtures/ucam_login.html'), 'utf-8');
  const noticesHtml = fs.readFileSync(path.resolve('tests/fixtures/ucam_authenticated_notices.html'), 'utf-8');

  it('detects unauthenticated login page accurately', () => {
    const dom = new JSDOM(loginHtml);
    expect(isUcamLoginPage(dom.window.document)).toBe(true);
    expect(isUcamAuthenticated(dom.window.document)).toBe(false);
  });

  it('detects authenticated student page accurately', () => {
    const dom = new JSDOM(noticesHtml);
    expect(isUcamLoginPage(dom.window.document)).toBe(false);
    expect(isUcamAuthenticated(dom.window.document)).toBe(true);
  });

  it('parses notices from authenticated notice board', () => {
    const dom = new JSDOM(noticesHtml);
    const notices = parseUcamNotices(dom.window.document, 'https://ucam.uiu.ac.bd/Notice/NoticeList.aspx');

    expect(notices).toHaveLength(2);
    expect(notices[0].title).toBe('Mid-Term Examination Schedule Fall 2026');
    expect(notices[0].publishedAt).not.toBeNull();
    expect(notices[0].url).toContain('NoticeDetail.aspx?id=9042');

    expect(notices[1].title).toBe('Course Withdrawal Deadline Reminder');
  });
});

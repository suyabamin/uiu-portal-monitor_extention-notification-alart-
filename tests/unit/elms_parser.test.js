import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { isElmsLoginPage, isElmsAuthenticated, parseElmsCourses, parseElmsCoursePage } from '../../src/portals/elms/parser.js';
import { ITEM_TYPES } from '../../src/core/constants.js';

describe('eLMS Parser', () => {
  const loginHtml = fs.readFileSync(path.resolve('tests/fixtures/elms_login.html'), 'utf-8');
  const dashboardHtml = fs.readFileSync(path.resolve('tests/fixtures/elms_dashboard.html'), 'utf-8');
  const courseHtml = fs.readFileSync(path.resolve('tests/fixtures/elms_course.html'), 'utf-8');

  it('detects unauthenticated login page accurately', () => {
    const dom = new JSDOM(loginHtml);
    expect(isElmsLoginPage(dom.window.document)).toBe(true);
    expect(isElmsAuthenticated(dom.window.document)).toBe(false);
  });

  it('detects authenticated dashboard page accurately', () => {
    const dom = new JSDOM(dashboardHtml);
    expect(isElmsLoginPage(dom.window.document)).toBe(false);
    expect(isElmsAuthenticated(dom.window.document)).toBe(true);
  });

  it('parses enrolled courses from dashboard', () => {
    const dom = new JSDOM(dashboardHtml);
    const courses = parseElmsCourses(dom.window.document);

    expect(courses).toHaveLength(2);
    expect(courses[0].courseId).toBe('101');
    expect(courses[0].courseName).toContain('CSE 4101');
    expect(courses[1].courseId).toBe('102');
    expect(courses[1].courseName).toContain('CSE 4203');
  });

  it('parses activities, resources, assignments and quizzes from course page', () => {
    const dom = new JSDOM(courseHtml);
    const items = parseElmsCoursePage(dom.window.document, '101', 'CSE 4101', 'https://elms.uiu.ac.bd/course/view.php?id=101');

    expect(items).toHaveLength(4);

    // Item 1: Lecture 01 PDF
    const res1 = items.find(i => i.itemId === '501');
    expect(res1).toBeDefined();
    expect(res1.type).toBe(ITEM_TYPES.RESOURCE);
    expect(res1.fileType).toBe('pdf');
    expect(res1.title).toContain('Lecture 01 - System Models and Architectures');

    // Item 2: Lecture 02 PPTX
    const res2 = items.find(i => i.itemId === '502');
    expect(res2).toBeDefined();
    expect(res2.fileType).toBe('pptx');

    // Item 3: Assignment with Due Date
    const assign = items.find(i => i.itemId === '503');
    expect(assign).toBeDefined();
    expect(assign.type).toBe(ITEM_TYPES.ASSIGNMENT);
    expect(assign.dueAt).not.toBeNull();

    // Item 4: Quiz
    const quiz = items.find(i => i.itemId === '504');
    expect(quiz).toBeDefined();
    expect(quiz.type).toBe(ITEM_TYPES.QUIZ);
    expect(quiz.dueAt).not.toBeNull();
  });
});

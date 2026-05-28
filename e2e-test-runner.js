import { test, expect, chromium, ConsoleMessage } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = 'd:/projects/Record-App/e2e-screenshots';
const BASE_URL = 'http://localhost:3001';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface PageTestResult {
  page: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  screenshot?: string;
  errors: string[];
  warnings: string[];
  consoleErrors: string[];
  elements: string[];
  description: string;
}

const results: PageTestResult[] = [];

async function capturePageInfo(page: any, url: string, pageName: string): Promise<Partial<PageTestResult>> {
  const consoleErrors: string[] = [];
  const elements: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Get page title
    const title = await page.title();

    // Get main content elements
    const body = await page.locator('body');
    const childCount = await body.locator('> *').count();
    elements.push(`body children: ${childCount}`);

    // Try to get headings
    const headings = await page.locator('h1, h2, h3').allTextContents();
    if (headings.length > 0) {
      elements.push(`headings: ${headings.slice(0, 5).join(', ')}`);
    }

    // Get buttons
    const buttons = await page.locator('button').count();
    elements.push(`buttons: ${buttons}`);

    // Get inputs
    const inputs = await page.locator('input').count();
    elements.push(`inputs: ${inputs}`);

    return {
      title,
      elements,
      consoleErrors
    };
  } catch (e: any) {
    return {
      consoleErrors,
      errors: [e.message]
    };
  }
}

async function testPage(pageName: string, url: string, description: string): Promise<PageTestResult> {
  console.log(`\n========== Testing ${pageName} ==========`);
  console.log(`URL: ${url}`);

  const result: PageTestResult = {
    page: pageName,
    url,
    status: 'FAIL',
    errors: [],
    warnings: [],
    consoleErrors: [],
    elements: [],
    description
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // Listen for console errors
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        result.consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (err: Error) => {
      result.errors.push(`Page error: ${err.message}`);
    });

    console.log('Navigating to page...');
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Response status: ${response?.status()}`);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check if page has content
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.trim().length > 0;
    console.log(`Page has content: ${hasContent}`);

    if (!hasContent) {
      result.errors.push('Page appears to be empty or not rendered');
    }

    // Get page info
    const pageInfo = await capturePageInfo(page, url, pageName);
    result.elements = pageInfo.elements || [];
    result.consoleErrors = pageInfo.consoleErrors || [];

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${pageName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    result.screenshot = screenshotPath;
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Get title
    result.title = await page.title();

    if (result.errors.length === 0 && result.consoleErrors.length === 0) {
      result.status = 'PASS';
    } else if (result.errors.length === 0) {
      result.status = 'PASS';
      result.warnings.push(`${result.consoleErrors.length} console error(s) detected`);
    }

  } catch (e: any) {
    result.errors.push(`Navigation failed: ${e.message}`);
  } finally {
    await browser.close();
  }

  console.log(`Status: ${result.status}`);
  if (result.errors.length > 0) {
    console.log(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.consoleErrors.length > 0) {
    console.log(`Console errors: ${result.consoleErrors.join('; ')}`);
  }

  return result;
}

async function testHomePageInteraction(): Promise<PageTestResult> {
  console.log(`\n========== Testing HomePage Interaction ==========`);

  const result: PageTestResult = {
    page: 'HomePage-Interaction',
    url: `${BASE_URL}/`,
    status: 'FAIL',
    errors: [],
    warnings: [],
    consoleErrors: [],
    elements: [],
    description: 'HomePage interaction test - click create story button'
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        result.consoleErrors.push(msg.text());
      }
    });

    console.log('Navigating to HomePage...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Look for create story button
    const createButtonSelectors = [
      'button:has-text("创建")',
      'button:has-text("Create")',
      'a[href="/create"]',
      'button:has-text("故事")'
    ];

    let createButtonFound = false;
    for (const selector of createButtonSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        console.log(`Found create button with selector: ${selector}`);
        createButtonFound = true;

        // Take before screenshot
        const beforePath = path.join(SCREENSHOT_DIR, `homepage-before-click-${Date.now()}.png`);
        await page.screenshot({ path: beforePath, fullPage: true });

        // Click it
        await button.click();
        await page.waitForTimeout(1500);

        // Take after screenshot
        const afterPath = path.join(SCREENSHOT_DIR, `homepage-after-click-${Date.now()}.png`);
        await page.screenshot({ path: afterPath, fullPage: true });

        console.log(`After click URL: ${page.url()}`);
        break;
      }
    }

    if (!createButtonFound) {
      result.warnings.push('Create button not found - checking page structure');
    }

    result.status = result.errors.length === 0 ? 'PASS' : 'FAIL';

  } catch (e: any) {
    result.errors.push(`Test failed: ${e.message}`);
  } finally {
    await browser.close();
  }

  return result;
}

async function testCreateStoryForm(): Promise<PageTestResult> {
  console.log(`\n========== Testing CreateStoryPage Form ==========`);

  const result: PageTestResult = {
    page: 'CreateStoryPage-Form',
    url: `${BASE_URL}/create`,
    status: 'FAIL',
    errors: [],
    warnings: [],
    consoleErrors: [],
    elements: [],
    description: 'CreateStoryPage form fill and submit test'
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        result.consoleErrors.push(msg.text());
      }
    });

    console.log('Navigating to CreateStoryPage...');
    await page.goto(`${BASE_URL}/create`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Take screenshot before fill
    const beforePath = path.join(SCREENSHOT_DIR, `create-story-before-${Date.now()}.png`);
    await page.screenshot({ path: beforePath, fullPage: true });

    // Fill title
    const titleInput = page.locator('input[type="text"], input[name="title"], input[placeholder*="标题"]').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill('E2E Test Story Title');
      console.log('Filled title input');
    } else {
      result.warnings.push('Title input not found');
    }

    // Fill content
    const contentInput = page.locator('textarea, input[name="content"], input[placeholder*="内容"]').first();
    if (await contentInput.count() > 0) {
      await contentInput.fill('This is test content from E2E test. Testing the story creation flow.');
      console.log('Filled content input');
    } else {
      result.warnings.push('Content input not found');
    }

    // Take screenshot after fill
    const afterPath = path.join(SCREENSHOT_DIR, `create-story-after-fill-${Date.now()}.png`);
    await page.screenshot({ path: afterPath, fullPage: true });

    // Submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("提交"), button:has-text("发布")').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      console.log('Clicked submit button');
      await page.waitForTimeout(1500);

      const submitPath = path.join(SCREENSHOT_DIR, `create-story-after-submit-${Date.now()}.png`);
      await page.screenshot({ path: submitPath, fullPage: true });
      console.log(`After submit URL: ${page.url()}`);
    } else {
      result.warnings.push('Submit button not found');
    }

    result.status = result.errors.length === 0 ? 'PASS' : 'FAIL';
    result.screenshot = beforePath;

  } catch (e: any) {
    result.errors.push(`Test failed: ${e.message}`);
  } finally {
    await browser.close();
  }

  return result;
}

async function runAllTests() {
  console.log('========================================');
  console.log('E2E Test Runner - Record App');
  console.log('========================================');
  console.log(`Screenshot directory: ${SCREENSHOT_DIR}`);
  console.log(`Frontend URL: ${BASE_URL}`);
  console.log('========================================');

  const tests = [
    { name: 'HomePage', url: `${BASE_URL}/`, desc: 'HomePage - Main landing page with story list' },
    { name: 'CreateStoryPage', url: `${BASE_URL}/create`, desc: 'CreateStoryPage - Story creation form' },
    { name: 'LoginPage', url: `${BASE_URL}/login`, desc: 'LoginPage - User login form' },
    { name: 'RegisterPage', url: `${BASE_URL}/register`, desc: 'RegisterPage - User registration form' },
    { name: 'ProfilePage', url: `${BASE_URL}/profile`, desc: 'ProfilePage - User profile page' },
    { name: 'PaymentPage', url: `${BASE_URL}/payment`, desc: 'PaymentPage - Payment page' },
  ];

  // Run page tests
  for (const test of tests) {
    const result = await testPage(test.name, test.url, test.desc);
    results.push(result);
  }

  // Run interaction tests
  const homeResult = await testHomePageInteraction();
  results.push(homeResult);

  const createResult = await testCreateStoryForm();
  results.push(createResult);

  // Print summary
  console.log('\n========================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('========================================');

  for (const r of results) {
    console.log(`\n[${r.status}] ${r.page}`);
    console.log(`  URL: ${r.url}`);
    if (r.title) console.log(`  Title: ${r.title}`);
    if (r.elements.length > 0) {
      console.log(`  Elements: ${r.elements.join(', ')}`);
    }
    if (r.screenshot) {
      console.log(`  Screenshot: ${r.screenshot}`);
    }
    if (r.errors.length > 0) {
      console.log(`  ERRORS: ${r.errors.join('; ')}`);
    }
    if (r.consoleErrors.length > 0) {
      console.log(`  Console Errors: ${r.consoleErrors.join('; ')}`);
    }
    if (r.warnings.length > 0) {
      console.log(`  Warnings: ${r.warnings.join('; ')}`);
    }
  }

  console.log('\n========================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log('========================================');
}

runAllTests().catch(console.error);
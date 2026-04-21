import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Fintech Automation Framework
 * Configures browsers, timeouts, and test settings
 */
export default defineConfig({
  testDir: './tests',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list']
  ],
  
  // Global settings
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'https://demo.fintech.com',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Global timeout for each action
    actionTimeout: 30000,
    
    // Global timeout for navigation
    navigationTimeout: 60000,
    
    // Ignore HTTPS errors for demo environments
    ignoreHTTPSErrors: true,
    
    // User agent
    userAgent: 'Fintech-Automation-Framework/1.0.0'
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Global setup and teardown
  globalSetup: './tests/global-setup.ts',
  
  // Test timeout
  timeout: 120000, // 2 minutes per test
  
  // Expect timeout
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  
  // Output directory
  outputDir: 'test-results/',
  
  // Web server (if needed for local testing)
  // Note: Web server disabled for this project as we're testing external demo site
});

import { Page, Browser, BrowserContext } from '@playwright/test';
import { logger } from './utils/Logger';

/**
 * Global Teardown Utility
 * Ensures secure cleanup of test data and browser contexts
 */
export class GlobalTeardown {
  private static instance: GlobalTeardown;

  private constructor() {}

  /**
   * Get singleton instance of GlobalTeardown
   */
  public static getInstance(): GlobalTeardown {
    if (!GlobalTeardown.instance) {
      GlobalTeardown.instance = new GlobalTeardown();
    }
    return GlobalTeardown.instance;
  }

  /**
   * Secure cleanup of page and browser context
   * @param page - Playwright page instance
   * @param context - Browser context (optional)
   * @param browser - Browser instance (optional)
   */
  async secureCleanup(page: Page, context?: BrowserContext, browser?: Browser): Promise<void> {
    try {
      logger.logAction('Starting secure cleanup process');

      // Step 1: Clear sensitive data from forms
      await this.clearSensitiveFormData(page);

      // Step 2: Clear local storage and session data
      await this.clearStorageData(page);

      // Step 3: Clear cookies and authentication tokens
      await this.clearAuthenticationData(page);

      // Step 4: Clear browser memory if possible
      await this.clearBrowserMemory(page);

      // Step 5: Close page and context
      await this.closePageContext(page, context, browser);

      logger.logSuccess('Secure cleanup completed successfully');
    } catch (error) {
      logger.logError('Secure cleanup failed', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Clear sensitive form data
   */
  private async clearSensitiveFormData(page: Page): Promise<void> {
    try {
      logger.logAction('Clearing sensitive form data');

      // Clear all input fields
      const inputs = page.locator('input[type="text"], input[type="password"], input[type="email"], input[type="number"], textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        await inputs.nth(i).clear();
      }

      // Clear select elements
      const selects = page.locator('select');
      const selectCount = await selects.count();
      
      for (let i = 0; i < selectCount; i++) {
        await selects.nth(i).selectOption({ index: 0 });
      }

      logger.logAction(`Cleared ${inputCount} input fields and ${selectCount} select elements`);
    } catch (error) {
      logger.logError('Failed to clear form data', error instanceof Error ? error : String(error));
    }
  }

  /**
   * Clear local storage, session storage, and cookies
   */
  private async clearStorageData(page: Page): Promise<void> {
    try {
      logger.logAction('Clearing browser storage data');

      // Clear local storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Clear all cookies
      const context = page.context();
      await context.clearCookies();

      // Clear indexedDB if accessible
      await page.evaluate(() => {
        if (window.indexedDB) {
          const databases = window.indexedDB.databases;
          databases.forEach((db) => {
            window.indexedDB.deleteDatabase(db.name);
          });
        }
      });

      logger.logAction('Cleared localStorage, sessionStorage, cookies, and IndexedDB');
    } catch (error) {
      logger.logError('Failed to clear storage data', error instanceof Error ? error : String(error));
    }
  }

  /**
   * Clear authentication tokens and session data
   */
  private async clearAuthenticationData(page: Page): Promise<void> {
    try {
      logger.logAction('Clearing authentication data');

      // Clear authorization headers if possible
      await page.evaluate(() => {
        // Clear any stored tokens
        if (window.localStorage) {
          const keysToRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.includes('token') || key.includes('auth') || key.includes('session'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => window.localStorage.removeItem(key));
        }

        // Clear any session storage
        if (window.sessionStorage) {
          const sessionKeys = Object.keys(window.sessionStorage);
          sessionKeys.forEach(key => {
            if (key.includes('token') || key.includes('auth') || key.includes('session'))) {
              window.sessionStorage.removeItem(key);
            }
          });
        }
      });

      logger.logAction('Cleared authentication tokens and session data');
    } catch (error) {
      logger.logError('Failed to clear authentication data', error instanceof Error ? error : String(error));
    }
  }

  /**
   * Clear browser memory and force garbage collection
   */
  private async clearBrowserMemory(page: Page): Promise<void> {
    try {
      logger.logAction('Clearing browser memory');

      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
        
        // Clear any global variables that might contain sensitive data
        if (window.testData) {
          delete window.testData;
        }
        if (window.testInitialBalance) {
          delete window.testInitialBalance;
        }
        if (window.testCurrentBalance) {
          delete window.testCurrentBalance;
        }
      });

      logger.logAction('Browser memory cleared');
    } catch (error) {
      logger.logError('Failed to clear browser memory', error instanceof Error ? error : String(error));
    }
  }

  /**
   * Close page, context, and browser instances
   */
  private async closePageContext(page: Page, context?: BrowserContext, browser?: Browser): Promise<void> {
    try {
      logger.logAction('Closing page and browser contexts');

      // Take final screenshot for audit
      try {
        await page.screenshot({ 
          path: `test-results/teardown-final-${Date.now()}.png`,
          fullPage: true 
        });
        logger.logAction('Final teardown screenshot captured');
      } catch (screenshotError) {
        logger.logWarning('Failed to capture teardown screenshot', screenshotError instanceof Error ? screenshotError.message : String(screenshotError));
      }

      // Close page
      if (page && !page.isClosed()) {
        await page.close();
        logger.logAction('Page closed');
      }

      // Close context
      if (context) {
        await context.close();
        logger.logAction('Browser context closed');
      }

      // Close browser
      if (browser && browser.isConnected()) {
        await browser.close();
        logger.logAction('Browser closed');
      }

      logger.logSuccess('All browser instances closed');
    } catch (error) {
      logger.logError('Failed to close page/context/browser', error instanceof Error ? error : String(error));
    }
  }

  /**
   * Emergency cleanup for failed tests
   */
  async emergencyCleanup(page: Page): Promise<void> {
    try {
      logger.logSecurity('Emergency cleanup triggered - test failure or crash');

      // Force clear everything
      await this.clearSensitiveFormData(page);
      await this.clearStorageData(page);
      await this.clearAuthenticationData(page);
      await this.clearBrowserMemory(page);

      // Close everything immediately
      await this.closePageContext(page);

      logger.logSuccess('Emergency cleanup completed');
    } catch (error) {
      logger.logError('Emergency cleanup failed', error instanceof Error ? error : String(error));
    }
  }

  /**
   * Validate cleanup was successful
   */
  async validateCleanup(): Promise<boolean> {
    try {
      // Check if any browser instances are still running
      const browsers = await require('playwright').browsers();
      const hasOpenBrowsers = browsers && browsers.length > 0;

      if (hasOpenBrowsers) {
        logger.logWarning('Browser instances still open after cleanup');
        return false;
      }

      logger.logSuccess('Cleanup validation passed - no open browsers');
      return true;
    } catch (error) {
      logger.logError('Cleanup validation failed', error instanceof Error ? error : String(error));
      return false;
    }
  }
}

// Export singleton instance for easy access
export const globalTeardown = GlobalTeardown.getInstance();

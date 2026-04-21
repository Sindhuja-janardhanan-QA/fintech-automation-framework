import { Page, Locator } from '@playwright/test';
import { config } from '../utils/ConfigManager';
import { logger } from '../utils/Logger';
import { otpGenerator } from '../utils/OTPGenerator';

/**
 * Page Object Model for Fintech Login Page
 * Handles authentication flow including credentials and MFA
 */
export class LoginPage {
  private page: Page;

  // Login form selectors
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly mfaInput: Locator;
  private readonly mfaSubmitButton: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.usernameInput = page.locator('input[name="username"], input[id="username"], input[placeholder*="username"], input[placeholder*="email"]');
    this.passwordInput = page.locator('input[name="password"], input[id="password"], input[placeholder*="password"]');
    this.loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), input[type="submit"]');
    this.mfaInput = page.locator('input[name="otp"], input[name="mfa"], input[placeholder*="code"], input[placeholder*="OTP"], input[maxlength="6"]');
    this.mfaSubmitButton = page.locator('button:has-text("Verify"), button:has-text("Submit"), button:has-text("Continue")');
    this.errorMessage = page.locator('.error, .alert-error, [role="alert"], .message-error');
  }

  /**
   * Navigate to the login page
   * @param loginUrl - The login URL (optional, will use config if not provided)
   */
  async navigateTo(loginUrl?: string): Promise<void> {
    try {
      const url = loginUrl || config.getOptionalSecret('LOGIN_URL', 'https://demo.fintech.com/login') || 'https://demo.fintech.com/login';
      logger.logAction(`Navigating to login page: ${url}`);
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');
      
      // Wait for login form to be visible
      await this.usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      
      logger.logSuccess('Successfully navigated to login page');
    } catch (error) {
      logger.logError('Failed to navigate to login page', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Login with username and password
   * @param username - The username for login
   * @param password - The password for login
   */
  async loginWithCredentials(username: string, password: string): Promise<void> {
    try {
      logger.logAction(`Attempting login with username: ${username}`, username);
      logger.logAction(`Using password: [MASKED]`, password);

      // Fill in credentials
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      
      // Click login button
      await this.loginButton.click();
      
      // Wait for either MFA or error
      await this.page.waitForTimeout(2000);
      
      logger.logSuccess('Credentials submitted successfully');
    } catch (error) {
      logger.logError('Failed to login with credentials', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Handle MFA/OTP verification
   * @param secret - The MFA secret for generating OTP
   */
  async handleMFA(secret: string): Promise<void> {
    try {
      logger.logAction('Starting MFA verification process');
      
      // Wait for MFA input to be visible
      await this.mfaInput.waitFor({ state: 'visible', timeout: 15000 });
      
      // Generate OTP token
      const otpToken = otpGenerator.generateToken(secret);
      logger.logAction(`Generated MFA token: ${otpToken}`, otpToken);
      
      // Fill in OTP
      await this.mfaInput.fill(otpToken);
      
      // Submit MFA
      await this.mfaSubmitButton.click();
      
      // Wait for navigation
      await this.page.waitForTimeout(3000);
      
      logger.logSuccess('MFA verification completed successfully');
    } catch (error) {
      logger.logError('MFA verification failed', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Fail-safe method for security error handling
   * Takes screenshot and logs security errors
   * @param error - The error that occurred
   * @param context - Context where the error occurred
   */
  async failSafe(error: Error | string, context: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotName = `security-error-${timestamp}.png`;
    
    try {
      // Log security error
      logger.logSecurity(`SECURITY_ERROR in ${context}: ${errorMessage}`, errorMessage);
      
      // Take screenshot for evidence
      await this.page.screenshot({ 
        path: `test-results/${screenshotName}`,
        fullPage: true 
      });
      
      logger.logAction(`Security screenshot saved: ${screenshotName}`);
      
      // Additional security measures
      await this.page.evaluate(() => {
        // Clear any sensitive data from forms
        const inputs = document.querySelectorAll('input[type="password"], input[type="text"]');
        inputs.forEach((input: Element) => {
          const htmlInput = input as HTMLInputElement;
          htmlInput.value = '';
        });
      });
      
    } catch (screenshotError) {
      logger.logError('Failed to take security screenshot', screenshotError instanceof Error ? screenshotError : String(screenshotError));
    }
  }

  /**
   * Complete authentication flow with fail-safe handling
   * @param username - The username
   * @param password - The password
   * @param mfaSecret - The MFA secret
   */
  async completeAuthentication(username: string, password: string, mfaSecret: string): Promise<void> {
    try {
      // Navigate to login
      await this.navigateTo();
      
      // Login with credentials
      await this.loginWithCredentials(username, password);
      
      // Check if MFA is required
      const mfaRequired = await this.mfaInput.isVisible({ timeout: 5000 });
      
      if (mfaRequired) {
        await this.handleMFA(mfaSecret);
      }
      
      // Verify successful authentication
      await this.verifyAuthenticationSuccess();
      
    } catch (error) {
      // Use fail-safe for any authentication errors
      await this.failSafe(error instanceof Error ? error : String(error), 'Authentication Flow');
      throw error;
    }
  }

  /**
   * Verify that authentication was successful
   */
  async verifyAuthenticationSuccess(): Promise<void> {
    try {
      // Wait for either dashboard URL or welcome message
      await this.page.waitForTimeout(2000);
      
      const currentUrl = this.page.url();
      const hasDashboardUrl = currentUrl.includes('/dashboard');
      
      // Check for welcome message
      const welcomeSelectors = [
        'h1:has-text("Welcome")',
        '.welcome-message',
        '[data-testid="welcome"]',
        '.user-greeting',
        'h2:has-text("Dashboard")'
      ];
      
      let hasWelcomeMessage = false;
      for (const selector of welcomeSelectors) {
        try {
          const element = this.page.locator(selector);
          if (await element.isVisible({ timeout: 2000 })) {
            hasWelcomeMessage = true;
            break;
          }
        } catch {
          // Continue checking other selectors
        }
      }
      
      if (hasDashboardUrl || hasWelcomeMessage) {
        logger.logSuccess(`Authentication successful - URL: ${currentUrl}`);
      } else {
        throw new Error('Authentication verification failed - no dashboard or welcome message found');
      }
      
    } catch (error) {
      logger.logError('Authentication verification failed', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Check if login page is currently displayed
   */
  async isLoginPageVisible(): Promise<boolean> {
    try {
      return await this.usernameInput.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if MFA form is displayed
   */
  async isMFAFormVisible(): Promise<boolean> {
    try {
      return await this.mfaInput.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Get any error message displayed
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      if (await this.errorMessage.isVisible({ timeout: 3000 })) {
        return await this.errorMessage.textContent() || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }
}

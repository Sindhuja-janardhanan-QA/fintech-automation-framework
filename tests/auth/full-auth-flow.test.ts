import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { config } from '../../src/utils/ConfigManager';
import { logger } from '../../src/utils/Logger';

/**
 * Full Authentication Flow E2E Test
 * Tests complete login process: Credentials -> MFA -> Dashboard
 * Uses real secrets from ConfigManager
 */
test.describe('Fintech Authentication Flow', () => {
  let loginPage: LoginPage;
  let page: Page;

  test.beforeAll(async () => {
    logger.logAction('Starting full authentication flow tests');
  });

  test.beforeEach(async ({ browser }) => {
    // Create new page context for each test
    page = await browser.newPage();
    loginPage = new LoginPage(page);
    
    // Set up page error handling
    page.on('pageerror', (error) => {
      logger.logError('Page error occurred', error);
    });
    
    page.on('requestfailed', (request) => {
      logger.logWarning(`Request failed: ${request.url()}`);
    });
  });

  test.afterEach(async () => {
    // Clean up page after each test
    if (page) {
      await page.close();
    }
  });

  test.afterAll(async () => {
    logger.logSuccess('Full authentication flow tests completed');
  });

  test('should complete full authentication flow successfully', async () => {
    try {
      // Get real credentials from ConfigManager
      const fintechConfig = config.getFintechConfig();
      const mfaSecret = config.getSecret('MFA_SECRET');
      
      logger.logAction('Starting full authentication flow test');
      logger.logAction(`Using username: ${fintechConfig.username}`, fintechConfig.username);
      logger.logAction(`Using client ID: ${fintechConfig.clientId}`, fintechConfig.clientId);

      // Step 1: Navigate to login page
      await test.step('Navigate to login page', async () => {
        await loginPage.navigateTo();
        const isLoginVisible = await loginPage.isLoginPageVisible();
        expect(isLoginVisible).toBe(true);
        logger.logSuccess('Login page navigation successful');
      });

      // Step 2: Login with credentials
      await test.step('Login with credentials', async () => {
        await loginPage.loginWithCredentials(
          fintechConfig.username,
          fintechConfig.password
        );
        
        // Wait a moment for potential MFA redirect
        await page.waitForTimeout(3000);
        
        logger.logSuccess('Credentials submitted successfully');
      });

      // Step 3: Handle MFA if required
      await test.step('Handle MFA verification', async () => {
        const isMFARequired = await loginPage.isMFAFormVisible();
        
        if (isMFARequired) {
          logger.logAction('MFA is required, proceeding with OTP verification');
          await loginPage.handleMFA(mfaSecret);
          logger.logSuccess('MFA verification completed');
        } else {
          logger.logAction('MFA not required, skipping OTP verification');
        }
      });

      // Step 4: Verify successful authentication
      await test.step('Verify authentication success', async () => {
        await loginPage.verifyAuthenticationSuccess();
        
        const currentUrl = page.url();
        logger.logAction(`Current URL after authentication: ${currentUrl}`);
        
        // Verify URL contains dashboard or welcome elements
        const hasDashboardUrl = currentUrl.includes('/dashboard');
        
        // Check for welcome message elements
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
            const element = page.locator(selector);
            if (await element.isVisible({ timeout: 2000 })) {
              hasWelcomeMessage = true;
              logger.logSuccess(`Found welcome element: ${selector}`);
              break;
            }
          } catch {
            // Continue checking other selectors
          }
        }
        
        // Assert that authentication was successful
        expect(hasDashboardUrl || hasWelcomeMessage).toBe(true);
        
        if (hasDashboardUrl) {
          logger.logSuccess(`Authentication successful - Dashboard URL detected: ${currentUrl}`);
        } else if (hasWelcomeMessage) {
          logger.logSuccess('Authentication successful - Welcome message detected');
        }
      });

      // Step 5: Additional security verification
      await test.step('Security verification', async () => {
        // Check for any error messages
        const errorMessage = await loginPage.getErrorMessage();
        if (errorMessage) {
          logger.logWarning(`Error message found: ${errorMessage}`);
          throw new Error(`Unexpected error after authentication: ${errorMessage}`);
        }
        
        // Verify page is stable
        await page.waitForLoadState('networkidle');
        
        logger.logSuccess('Security verification completed');
      });

    } catch (error) {
      // Use fail-safe for any test failures
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'Full Authentication Flow Test'
      );
      
      // Re-throw the error to fail the test
      throw error;
    }
  });

  test('should handle invalid credentials gracefully', async () => {
    try {
      // Test with invalid credentials
      await test.step('Test invalid credentials', async () => {
        await loginPage.navigateTo();
        
        // Use invalid credentials
        await loginPage.loginWithCredentials('invalid@example.com', 'invalidpassword');
        
        // Wait for error response
        await page.waitForTimeout(3000);
        
        // Check for error message
        const errorMessage = await loginPage.getErrorMessage();
        
        // Should either have error message or still be on login page
        const stillOnLoginPage = await loginPage.isLoginPageVisible();
        
        expect(errorMessage !== null || stillOnLoginPage).toBe(true);
        
        if (errorMessage) {
          logger.logAction(`Expected error message received: ${errorMessage}`);
        } else {
          logger.logAction('Still on login page as expected for invalid credentials');
        }
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'Invalid Credentials Test'
      );
      throw error;
    }
  });

  test('should handle invalid MFA token gracefully', async () => {
    try {
      // Get valid credentials but use invalid MFA
      const fintechConfig = config.getFintechConfig();
      
      await test.step('Test invalid MFA token', async () => {
        await loginPage.navigateTo();
        await loginPage.loginWithCredentials(
          fintechConfig.username,
          fintechConfig.password
        );
        
        // Wait for MFA form
        const isMFARequired = await loginPage.isMFAFormVisible();
        
        if (isMFARequired) {
          // Manually enter invalid MFA token
          const mfaInput = page.locator('input[name="otp"], input[name="mfa"], input[placeholder*="code"], input[placeholder*="OTP"], input[maxlength="6"]');
          const mfaSubmitButton = page.locator('button:has-text("Verify"), button:has-text("Submit"), button:has-text("Continue")');
          
          await mfaInput.fill('999999'); // Invalid token
          await mfaSubmitButton.click();
          
          // Wait for error response
          await page.waitForTimeout(3000);
          
          // Should show error or still be on MFA form
          const errorMessage = await loginPage.getErrorMessage();
          const stillOnMFAForm = await loginPage.isMFAFormVisible();
          
          expect(errorMessage !== null || stillOnMFAForm).toBe(true);
          
          logger.logAction('Invalid MFA token handled gracefully');
        } else {
          logger.logAction('MFA not required, skipping invalid MFA test');
        }
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'Invalid MFA Token Test'
      );
      throw error;
    }
  });

  test('should handle network timeouts gracefully', async () => {
    try {
      await test.step('Test network timeout handling', async () => {
        // Simulate slow network
        await page.route('**/*', (route) => {
          // Delay some requests to simulate timeout
          if (route.request().url().includes('/auth')) {
            setTimeout(() => route.continue(), 10000); // 10 second delay
          } else {
            route.continue();
          }
        });
        
        await loginPage.navigateTo();
        
        // Try login with slow network
        const fintechConfig = config.getFintechConfig();
        await loginPage.loginWithCredentials(
          fintechConfig.username,
          fintechConfig.password
        );
        
        // Wait for timeout or success
        await page.waitForTimeout(15000);
        
        // Check if page handled timeout gracefully
        const stillOnLoginPage = await loginPage.isLoginPageVisible();
        const errorMessage = await loginPage.getErrorMessage();
        
        // Should either succeed or show timeout error
        expect(stillOnLoginPage || errorMessage !== null).toBe(true);
        
        logger.logAction('Network timeout handling test completed');
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'Network Timeout Test'
      );
      throw error;
    }
  });
});

// Manual test function for running outside of Playwright test runner
export async function runManualAuthTest() {
  console.log('🔧 Running Manual Authentication Flow Test...\n');
  
  try {
    // This would require a Playwright browser instance
    // For demonstration purposes, we'll just test the configuration
    logger.logAction('Testing configuration for manual auth test');
    
    const fintechConfig = config.getFintechConfig();
    const mfaSecret = config.getSecret('MFA_SECRET');
    
    console.log('✅ Configuration loaded successfully');
    console.log(`   Username: ${fintechConfig.username}`);
    console.log(`   Client ID: ${fintechConfig.clientId}`);
    console.log(`   MFA Secret: ${mfaSecret.substring(0, 8)}****`);
    
    console.log('\n🎉 Manual auth test configuration verified!');
    console.log('💡 To run full E2E test, use: npx playwright test tests/auth/full-auth-flow.test.ts');
    
  } catch (error) {
    console.error('❌ Manual auth test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run manual test if this file is executed directly
if (require.main === module) {
  runManualAuthTest();
}

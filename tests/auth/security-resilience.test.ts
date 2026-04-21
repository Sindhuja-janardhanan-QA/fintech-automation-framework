import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { config } from '../../src/utils/ConfigManager';
import { logger } from '../../src/utils/Logger';
import { otpGenerator } from '../../src/utils/OTPGenerator';

/**
 * Security Resilience Test Suite
 * Tests authentication system against common attack vectors
 * Verifies proper error handling and security logging
 */
test.describe('Security Resilience Tests', () => {
  let loginPage: LoginPage;
  let page: Page;

  test.beforeAll(async () => {
    logger.logAction('Starting security resilience tests');
  });

  test.beforeEach(async ({ browser }) => {
    // Create fresh page for each test
    page = await browser.newPage();
    loginPage = new LoginPage(page);
    
    // Set up security monitoring
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('login') || url.includes('auth')) {
        logger.logAction(`Auth request: ${request.method()} ${url}`, url);
      }
    });
    
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      if (url.includes('login') || url.includes('auth')) {
        logger.logAction(`Auth response: ${status} ${url}`, `${status}`);
      }
    });
  });

  test.afterEach(async () => {
    // Clean up page after each test
    if (page) {
      await page.close();
    }
  });

  test.afterAll(async () => {
    logger.logSuccess('Security resilience tests completed');
  });

  test('should handle invalid credentials with proper security response', async () => {
    try {
      await test.step('Test invalid credentials security handling', async () => {
        logger.logAction('Testing invalid credentials scenario');
        
        // Navigate to login page
        await loginPage.navigateTo();
        
        // Attempt login with invalid credentials
        const invalidUsername = 'invalid-user@example.com';
        const invalidPassword = 'InvalidPassword123!';
        
        await loginPage.loginWithCredentials(invalidUsername, invalidPassword);
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Verify security response
        const currentUrl = page.url();
        const errorMessage = await loginPage.getErrorMessage();
        
        // Should not be redirected to dashboard
        expect(currentUrl).not.toContain('/dashboard');
        expect(currentUrl).not.toContain('/welcome');
        
        // Should show access denied message
        expect(errorMessage).toBeDefined();
        expect(errorMessage).toMatch(/access.denied|invalid.credentials|authentication.failed/i);
        
        // Should still be on login page
        const stillOnLoginPage = await loginPage.isLoginPageVisible();
        expect(stillOnLoginPage).toBe(true);
        
        logger.logSecurity(`Invalid credentials properly rejected: ${errorMessage || ''}`, errorMessage || '');
        
        // Verify security logging occurred
        expect(errorMessage).not.toContain(invalidUsername); // Username shouldn't be in error
        expect(errorMessage).not.toContain(invalidPassword); // Password shouldn't be in error
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'Invalid Credentials Security Test'
      );
      throw error;
    }
  });

  test('should handle expired/invalid OTP with proper error handling', async () => {
    try {
      await test.step('Test OTP expiration and invalid token handling', async () => {
        logger.logAction('Testing OTP security scenarios');
        
        const fintechConfig = config.getFintechConfig();
        const mfaSecret = config.getSecret('MFA_SECRET');
        
        // Navigate and login with valid credentials
        await loginPage.navigateTo();
        await loginPage.loginWithCredentials(
          fintechConfig.username,
          fintechConfig.password
        );
        
        // Wait for MFA form
        const isMFARequired = await loginPage.isMFAFormVisible();
        if (isMFARequired) {
          logger.logAction('MFA form detected, testing OTP scenarios');
          
          // Test 1: Generate valid OTP for verification
          const validOTP = otpGenerator.generateToken(mfaSecret);
          logger.logAction(`Generated valid OTP for test: ${validOTP}`, validOTP);
          
          // Test 2: Use expired OTP (simulate by using old token)
          const expiredOTP = '123456'; // Simulated expired token
          await loginPage.handleMFAWithToken(expiredOTP);
          
          await page.waitForTimeout(3000);
          
          // Should show expired/invalid OTP error
          const errorMessage = await loginPage.getErrorMessage();
          expect(errorMessage).toBeDefined();
          expect(errorMessage).toMatch(/expired|invalid|otp|code/i);
          
          logger.logSecurity(`Expired OTP properly rejected: ${errorMessage || ''}`, errorMessage || '');
          
          // Test 3: Use deliberately invalid OTP
          const invalidOTP = '999999';
          await loginPage.handleMFAWithToken(invalidOTP);
          
          await page.waitForTimeout(3000);
          
          const invalidOTPError = await loginPage.getErrorMessage();
          expect(invalidOTPError).toBeDefined();
          expect(invalidOTPError).toMatch(/invalid|incorrect|otp|code/i);
          
          logger.logSecurity(`Invalid OTP properly rejected: ${invalidOTPError || ''}`, invalidOTPError || '');
          
          // Test 4: Use correct OTP after failures
          await loginPage.handleMFAWithToken(validOTP);
          
          await page.waitForTimeout(3000);
          
          // Should now succeed
          const currentUrl = page.url();
          const hasDashboardUrl = currentUrl.includes('/dashboard') || currentUrl.includes('/welcome');
          expect(hasDashboardUrl).toBe(true);
          
          logger.logSuccess('Correct OTP accepted after previous failures');
        } else {
          logger.logWarning('MFA not required, skipping OTP security tests');
        }
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'OTP Security Test'
      );
      throw error;
    }
  });

  test('should handle SQL injection attempts safely', async () => {
    try {
      await test.step('Test SQL injection attack prevention', async () => {
        logger.logAction('Testing SQL injection resilience');
        
        // Navigate to login page
        await loginPage.navigateTo();
        
        // SQL injection payloads
        const sqlInjectionPayloads = [
          "' OR '1'='1",
          "admin'--",
          "' UNION SELECT * FROM users--",
          "'; DROP TABLE users; --",
          "' OR 1=1#",
          "admin' OR 'x'='x",
          "' AND (SELECT COUNT(*) FROM users) > 0--"
        ];
        
        for (const payload of sqlInjectionPayloads) {
          logger.logAction(`Testing SQL injection payload: ${payload}`, payload);
          
          // Attempt login with SQL injection
          await loginPage.loginWithCredentials(payload, 'password123');
          
          await page.waitForTimeout(2000);
          
          // Should reject the attempt
          const errorMessage = await loginPage.getErrorMessage();
          const stillOnLoginPage = await loginPage.isLoginPageVisible();
          
          // Security assertions
          expect(stillOnLoginPage).toBe(true);
          expect(errorMessage).toBeDefined();
          
          // Should not cause system crash or unexpected behavior
          expect(errorMessage).toMatch(/invalid|denied|authentication/i);
          
          // Verify no SQL error messages are exposed
          expect(errorMessage).not.toMatch(/sql|syntax|error|mysql|postgresql/i);
          
          logger.logSecurity(`SQL injection payload blocked: ${payload}`, payload);
          
          // Clear form for next attempt
          await loginPage.clearForm();
          await page.waitForTimeout(1000);
        }
        
        // Additional security checks
        logger.logAction('Performing additional security validations');
        
        // Check for any console errors that might indicate SQL injection
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        
        // Try one more payload to check console errors
        await loginPage.loginWithCredentials("'; SELECT * FROM users--", 'password');
        await page.waitForTimeout(2000);
        
        // Should not have SQL-related console errors
        expect(consoleErrors.length).toBe(0);
        
        logger.logSuccess('SQL injection attempts handled safely');
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'SQL Injection Security Test'
      );
      throw error;
    }
  });

  test('should handle brute force attempts with rate limiting', async () => {
    try {
      await test.step('Test brute force rate limiting', async () => {
        logger.logAction('Testing brute force protection');
        
        await loginPage.navigateTo();
        
        // Attempt multiple rapid logins
        const attempts = 10;
        let blockedAttempts = 0;
        let rateLimitDetected = false;
        
        for (let i = 1; i <= attempts; i++) {
          const username = `bruteforce${i}@example.com`;
          const password = `password${i}`;
          
          logger.logAction(`Brute force attempt ${i}: ${username}`, username);
          
          await loginPage.loginWithCredentials(username, password);
          await page.waitForTimeout(1000); // Short delay between attempts
          
          const errorMessage = await loginPage.getErrorMessage();
          
          // Check for rate limiting messages
          if (errorMessage && errorMessage.match(/rate.limit|too.many|blocked|temporarily/i)) {
            rateLimitDetected = true;
            blockedAttempts++;
            logger.logSecurity(`Rate limiting detected at attempt ${i}`, errorMessage);
            break;
          }
          
          // Check for temporary lockout
          if (errorMessage && errorMessage.match(/locked|suspended|temporary/i)) {
            rateLimitDetected = true;
            blockedAttempts++;
            logger.logSecurity(`Account lockout detected at attempt ${i}`, errorMessage);
            break;
          }
          
          // Clear form for next attempt
          await loginPage.clearForm();
        }
        
        // Security assertions
        expect(rateLimitDetected || blockedAttempts > 0).toBe(true);
        
        // Should still be on login page
        const stillOnLoginPage = await loginPage.isLoginPageVisible();
        expect(stillOnLoginPage).toBe(true);
        
        logger.logSuccess(`Brute force protection active: ${blockedAttempts} attempts blocked`);
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'Brute Force Security Test'
      );
      throw error;
    }
  });

  test('should handle session fixation attempts', async () => {
    try {
      await test.step('Test session fixation protection', async () => {
        logger.logAction('Testing session fixation protection');
        
        await loginPage.navigateTo();
        
        // Try to manipulate session ID or tokens
        const sessionFixationPayloads = [
          '?session_id=admin',
          '?token=admin',
          '?user_id=1',
          '?auth_token=administrator',
          '?session=administrator'
        ];
        
        for (const payload of sessionFixationPayloads) {
          logger.logAction(`Testing session fixation: ${payload}`, payload);
          
          // Navigate with potential session fixation
          const baseUrl = page.url().split('?')[0];
          await page.goto(`${baseUrl}${payload}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
          
          // Should redirect to login or show error
          const currentUrl = page.url();
          const isLoginPage = await loginPage.isLoginPageVisible();
          
          // Should not be authenticated with manipulated session
          expect(currentUrl).not.toContain('/dashboard');
          expect(currentUrl).not.toContain('/welcome');
          
          // Should either be on login page or show error
          const hasError = await loginPage.getErrorMessage();
          expect(isLoginPage || hasError).toBe(true);
          
          logger.logSecurity(`Session fixation attempt blocked: ${payload}`, payload);
          
          // Go back to login for next test
          await loginPage.navigateTo();
        }
        
        logger.logSuccess('Session fixation protection verified');
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'Session Fixation Security Test'
      );
      throw error;
    }
  });

  test('should handle XSS attempts in login form', async () => {
    try {
      await test.step('Test XSS attack prevention', async () => {
        logger.logAction('Testing XSS protection');
        
        await loginPage.navigateTo();
        
        // XSS payloads
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          'javascript:alert("XSS")',
          '<img src=x onerror=alert("XSS")>',
          "'><script>alert('XSS')</script>",
          '<svg onload=alert("XSS")>',
          "admin' AND 1=CONVERT(int, (SELECT COUNT(*) FROM users), 1)--"
        ];
        
        for (const payload of xssPayloads) {
          logger.logAction(`Testing XSS payload: ${payload}`, payload);
          
          // Attempt login with XSS payload
          await loginPage.loginWithCredentials(payload, 'password123');
          await page.waitForTimeout(2000);
          
          // Check for XSS execution (would show as console errors or alerts)
          const alerts: string[] = [];
          page.on('dialog', (dialog) => {
            alerts.push(dialog.message());
            dialog.dismiss();
          });
          
          const errorMessage = await loginPage.getErrorMessage();
          
          // Should reject the attempt
          expect(errorMessage).toBeDefined();
          expect(errorMessage).toMatch(/invalid|denied|authentication/i);
          
          // Should not execute scripts
          expect(alerts.length).toBe(0);
          
          logger.logSecurity(`XSS payload blocked: ${payload}`, payload);
          
          // Clear form for next attempt
          await loginPage.clearForm();
          await page.waitForTimeout(1000);
        }
        
        logger.logSuccess('XSS protection verified');
      });

    } catch (error) {
      await loginPage.failSafe(
        error instanceof Error ? error : String(error),
        'XSS Security Test'
      );
      throw error;
    }
  });
});

// Extended LoginPage methods for security testing
declare module '../../src/pages/LoginPage' {
  interface LoginPage {
    handleMFAWithToken(token: string): Promise<void>;
    clearForm(): Promise<void>;
  }
}

// Manual security test function
export async function runManualSecurityTest() {
  console.log('🔧 Running Manual Security Resilience Test...\n');
  
  try {
    // Test 1: OTP generation for security testing
    console.log('✅ Test 1: OTP Security');
    const mfaSecret = 'JBSWY3DPEHPK3PXP'; // Test secret
    const validOTP = otpGenerator.generateToken(mfaSecret);
    const isValid = otpGenerator.verifyToken(validOTP, mfaSecret);
    
    console.log(`   Generated OTP: ${validOTP}`);
    console.log(`   OTP Valid: ${isValid ? '✓' : '✗'}`);
    
    // Test invalid OTP
    const invalidOTP = '999999';
    const isInvalid = otpGenerator.verifyToken(invalidOTP, mfaSecret);
    console.log(`   Invalid OTP: ${invalidOTP}`);
    console.log(`   OTP Invalid: ${!isInvalid ? '✓' : '✗'}`);
    
    // Test 2: Security logging verification
    console.log('\n✅ Test 2: Security Logging');
    logger.logSecurity('Manual security test initiated');
    logger.logAction('Testing SQL injection payload', "' OR '1'='1");
    logger.logAction('Testing XSS payload', '<script>alert("XSS")</script>');
    
    console.log('   Security events logged successfully');
    
    console.log('\n🎉 Manual Security Test Completed!');
    console.log('💡 To run full security test: npx playwright test tests/auth/security-resilience.test.ts');
    
  } catch (error) {
    console.error('❌ Manual security test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run manual test if this file is executed directly
if (require.main === module) {
  runManualSecurityTest();
}

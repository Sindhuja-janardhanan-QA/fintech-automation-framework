import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TransactionPage } from '../../src/pages/TransactionPage';
import { config } from '../../src/utils/ConfigManager';
import { logger } from '../../src/utils/Logger';
import { currencyUtils } from '../../src/utils/CurrencyUtils';

/**
 * Balance Integrity Test Suite
 * Tests transaction flow with precise balance calculations
 * Ensures no rounding errors and proper error handling
 */
test.describe('Transaction Balance Integrity', () => {
  let loginPage: LoginPage;
  let transactionPage: TransactionPage;
  let page: Page;

  test.beforeAll(async () => {
    logger.logAction('Starting transaction balance integrity tests');
  });

  test.beforeEach(async ({ browser }) => {
    // Create fresh page for each test
    page = await browser.newPage();
    loginPage = new LoginPage(page);
    transactionPage = new TransactionPage(page);
    
    // Set up page error handling
    page.on('pageerror', (error) => {
      logger.logError('Page error in transaction test', error);
    });
  });

  test.afterEach(async () => {
    // Clean up page after each test
    if (page) {
      await page.close();
    }
  });

  test.afterAll(async () => {
    logger.logSuccess('Transaction balance integrity tests completed');
  });

  test('should complete full transaction flow with balance verification', async () => {
    try {
      // Get configuration
      const paymentAmount = config.getPaymentAmount();
      const defaultCurrency = config.getDefaultCurrency();
      
      logger.logAction(`Testing transaction flow with amount: ${defaultCurrency} ${paymentAmount}`, paymentAmount.toString());

      // Step 1: Complete authentication
      await test.step('Authenticate user', async () => {
        const fintechConfig = config.getFintechConfig();
        const mfaSecret = config.getSecret('MFA_SECRET');
        
        await loginPage.completeAuthentication(
          fintechConfig.username,
          fintechConfig.password,
          mfaSecret
        );
        
        logger.logSuccess('Authentication completed');
      });

      // Step 2: Navigate to transaction page
      await test.step('Navigate to transaction page', async () => {
        await transactionPage.navigateToTransactionPage();
        
        const isReady = await transactionPage.isTransactionPageReady();
        expect(isReady).toBe(true);
        
        logger.logSuccess('Transaction page loaded successfully');
      });

      // Step 3: Capture initial balance
      await test.step('Capture initial balance', async () => {
        const initialBalance = await transactionPage.getCurrentBalance();
        
        expect(initialBalance).toBeGreaterThan(0);
        logger.logAction(`Initial balance captured: ${initialBalance}`, initialBalance.toString());
        
        // Store initial balance for later verification
        await page.evaluate((balance) => {
          (window as any).testInitialBalance = balance;
        }, initialBalance);
      });

      // Step 4: Send payment
      await test.step('Send payment', async () => {
        const recipient = 'test-recipient@example.com';
        
        const result = await transactionPage.completeTransaction(recipient, paymentAmount);
        
        expect(result.success).toBe(true);
        expect(result.errorMessage).toBeUndefined();
        
        logger.logSuccess(`Payment sent successfully: ${defaultCurrency} ${paymentAmount} to ${recipient}`);
      });

      // Step 5: Verify balance integrity
      await test.step('Verify balance integrity', async () => {
        // Get initial balance from window storage
        const initialBalance = await page.evaluate(() => (window as any).testInitialBalance);
        
        // Get current balance after transaction
        const currentBalance = await transactionPage.getCurrentBalance();
        
        // Calculate expected balance using integer arithmetic
        const expectedBalance = currencyUtils.calculateExpectedBalance(
          currencyUtils.toSmallestUnit(initialBalance),
          -currencyUtils.toSmallestUnit(paymentAmount) // Negative because money was sent
        );
        const expectedBalanceFormatted = currencyUtils.fromSmallestUnit(expectedBalance);
        
        logger.logAction(`Balance verification: Initial=${initialBalance}, Payment=${paymentAmount}, Expected=${expectedBalanceFormatted}, Actual=${currentBalance}`, 
          `${initialBalance},${paymentAmount},${expectedBalanceFormatted},${currentBalance}`);
        
        // Verify balance integrity (allow small difference due to potential fees)
        const difference = Math.abs(currentBalance - expectedBalanceFormatted);
        expect(difference).toBeLessThan(0.01); // Less than 1 cent difference
        
        // Verify balance decreased by correct amount
        const actualDifference = initialBalance - currentBalance;
        expect(Math.abs(actualDifference - paymentAmount)).toBeLessThan(0.01);
        
        logger.logSuccess(`Balance integrity verified: Difference of ${difference} is acceptable`);
      });

    } catch (error) {
      logger.logError('Transaction flow test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should handle insufficient funds gracefully', async () => {
    try {
      // Step 1: Authenticate
      await test.step('Authenticate user', async () => {
        const fintechConfig = config.getFintechConfig();
        const mfaSecret = config.getSecret('MFA_SECRET');
        
        await loginPage.completeAuthentication(
          fintechConfig.username,
          fintechConfig.password,
          mfaSecret
        );
      });

      // Step 2: Navigate to transaction page
      await test.step('Navigate to transaction page', async () => {
        await transactionPage.navigateToTransactionPage();
        const isReady = await transactionPage.isTransactionPageReady();
        expect(isReady).toBe(true);
      });

      // Step 3: Get current balance
      await test.step('Get current balance', async () => {
        const currentBalance = await transactionPage.getCurrentBalance();
        expect(currentBalance).toBeGreaterThan(0);
        
        logger.logAction(`Current balance for insufficient funds test: ${currentBalance}`, currentBalance.toString());
        
        // Store balance for calculation
        await page.evaluate((balance) => {
          (window as any).testCurrentBalance = balance;
        }, currentBalance);
      });

      // Step 4: Attempt payment with insufficient funds
      await test.step('Attempt payment with insufficient funds', async () => {
        const currentBalance = await page.evaluate(() => (window as any).testCurrentBalance);
        
        // Calculate amount higher than current balance
        const excessiveAmount = currentBalance * 2; // Double the current balance
        const recipient = 'insufficient-funds-test@example.com';
        
        logger.logAction(`Attempting excessive payment: ${excessiveAmount}`, excessiveAmount.toString());
        
        const result = await transactionPage.completeTransaction(recipient, excessiveAmount);
        
        // Verify transaction failed
        expect(result.success).toBe(false);
        expect(result.errorMessage).toBeDefined();
        expect(result.errorMessage).toMatch(/insufficient|funds|balance/i);
        
        // Verify balance unchanged
        expect(result.newBalance).toBe(result.previousBalance);
        
        logger.logSuccess(`Insufficient funds handled correctly: ${result.errorMessage}`);
      });

      // Step 5: Verify error display
      await test.step('Verify insufficient funds error display', async () => {
        const isErrorVisible = await transactionPage.isInsufficientFundsErrorVisible();
        const errorMessage = await transactionPage.getErrorMessage();
        
        expect(isErrorVisible).toBe(true);
        expect(errorMessage).toMatch(/insufficient|funds|balance/i);
        
        logger.logAction(`Insufficient funds error verified: ${errorMessage || ''}`, errorMessage || '');
      });

    } catch (error) {
      logger.logError('Insufficient funds test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should handle currency precision correctly', async () => {
    try {
      // Test currency utility precision
      await test.step('Test currency precision handling', async () => {
        const testAmounts = [
          { input: 1.25, expected: 125 },
          { input: 0.99, expected: 99 },
          { input: 100.00, expected: 10000 },
          { input: 1234.56, expected: 123456 }
        ];

        testAmounts.forEach(({ input, expected }) => {
          const result = currencyUtils.toSmallestUnit(input);
          expect(result).toBe(expected);
          
          logger.logAction(`Precision test: ${input} → ${result} (expected: ${expected})`, 
            `${input},${result},${expected}`);
        });

        // Test reverse conversion
        const reverseTests = [
          { input: 125, expected: 1.25 },
          { input: 99, expected: 0.99 },
          { input: 10000, expected: 100.00 },
          { input: 123456, expected: 1234.56 }
        ];

        reverseTests.forEach(({ input, expected }) => {
          const result = currencyUtils.fromSmallestUnit(input);
          expect(result).toBe(expected);
          
          logger.logAction(`Reverse precision test: ${input} → ${result} (expected: ${expected})`, 
            `${input},${result},${expected}`);
        });

        logger.logSuccess('Currency precision tests passed');
      });

    } catch (error) {
      logger.logError('Currency precision test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should handle currency formatting and stripping', async () => {
    try {
      await test.step('Test currency formatting and stripping', async () => {
        const testCases = [
          { input: '$1,234.56', expected: 1234.56, currency: 'USD' },
          { input: '€1.234,56', expected: 1234.56, currency: 'EUR' },
          { input: '£1,234.56', expected: 1234.56, currency: 'GBP' },
          { input: '¥1,234.56', expected: 1234.56, currency: 'JPY' },
          { input: '(€500.00)', expected: -500.00, currency: 'EUR' }, // Negative balance
        ];

        testCases.forEach(({ input, expected, currency }) => {
          // Test stripping
          const stripped = currencyUtils.stripCurrencyFormatting(input);
          expect(Math.abs(stripped - expected)).toBeLessThan(0.01);
          
          // Test formatting
          const formatted = currencyUtils.formatCurrency(expected, 'en-US', currency);
          expect(formatted).toContain(currency);
          
          logger.logAction(`Currency test: "${input}" → ${stripped} → "${formatted}"`, input);
        });

        logger.logSuccess('Currency formatting and stripping tests passed');
      });

    } catch (error) {
      logger.logError('Currency formatting test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should handle balance calculations with integer arithmetic', async () => {
    try {
      await test.step('Test integer arithmetic balance calculations', async () => {
        const testCases = [
          { initial: 1000.00, change: -250.75, expected: 749.25 },
          { initial: 500.50, change: -100.25, expected: 400.25 },
          { initial: 0.99, change: -0.99, expected: 0.00 },
          { initial: 1234.56, change: -1234.56, expected: 0.00 }
        ];

        testCases.forEach(({ initial, change, expected }) => {
          const initialCents = currencyUtils.toSmallestUnit(initial);
          const changeCents = currencyUtils.toSmallestUnit(change);
          
          const resultCents = currencyUtils.calculateExpectedBalance(initialCents, changeCents);
          const result = currencyUtils.fromSmallestUnit(resultCents);
          
          expect(Math.abs(result - expected)).toBeLessThan(0.01);
          
          logger.logAction(`Balance calculation: ${initial} ${change >= 0 ? '+' : ''}${change} = ${result} (expected: ${expected})`, 
            `${initial},${change},${result},${expected}`);
        });

        logger.logSuccess('Integer arithmetic balance calculations passed');
      });

    } catch (error) {
      logger.logError('Balance calculation test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });
});

// Manual test function for running outside of Playwright test runner
export async function runManualBalanceTest() {
  console.log('🔧 Running Manual Balance Integrity Test...\n');
  
  try {
    // Test currency precision
    console.log('✅ Testing Currency Precision');
    const testAmount = 1.25;
    const smallestUnit = currencyUtils.toSmallestUnit(testAmount);
    const backToAmount = currencyUtils.fromSmallestUnit(smallestUnit);
    
    console.log(`   Input: ${testAmount}`);
    console.log(`   Smallest Unit: ${smallestUnit}`);
    console.log(`   Back to Amount: ${backToAmount}`);
    console.log(`   Precision Test: ${testAmount === backToAmount ? '✓' : '✗'}`);
    
    // Test balance calculation
    console.log('\n✅ Testing Balance Calculation');
    const initialBalance = 1000.00;
    const paymentAmount = 250.75;
    const expectedBalance = currencyUtils.calculateExpectedBalance(
      currencyUtils.toSmallestUnit(initialBalance),
      -currencyUtils.toSmallestUnit(paymentAmount)
    );
    const finalBalance = currencyUtils.fromSmallestUnit(expectedBalance);
    
    console.log(`   Initial Balance: ${initialBalance}`);
    console.log(`   Payment Amount: ${paymentAmount}`);
    console.log(`   Expected Balance: ${finalBalance}`);
    console.log(`   Calculation Test: ${finalBalance === 749.25 ? '✓' : '✗'}`);
    
    // Test currency stripping
    console.log('\n✅ Testing Currency Stripping');
    const testStrings = ['$1,234.56', '€1.234,56', '£1,234.56'];
    testStrings.forEach(str => {
      const stripped = currencyUtils.stripCurrencyFormatting(str);
      console.log(`   "${str}" → ${stripped}`);
    });
    
    console.log('\n🎉 Manual Balance Integrity Test Completed!');
    console.log('💡 To run full E2E test: npx playwright test tests/transactions/balance-integrity.test.ts');
    
  } catch (error) {
    console.error('❌ Manual balance test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run manual test if this file is executed directly
if (require.main === module) {
  runManualBalanceTest();
}

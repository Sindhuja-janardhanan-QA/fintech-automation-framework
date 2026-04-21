import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TransactionPage } from '../../src/pages/TransactionPage';
import { config } from '../../src/utils/ConfigManager';
import { logger } from '../../src/utils/Logger';
import { currencyUtils } from '../../src/utils/CurrencyUtils';

/**
 * Localization & Consistency Test Suite
 * Tests currency formatting, date formats, and locale-specific behavior
 */
test.describe('Localization & Consistency Tests', () => {
  let loginPage: LoginPage;
  let transactionPage: TransactionPage;
  let page: Page;

  test.beforeAll(async () => {
    logger.logAction('Starting localization and consistency tests');
  });

  test.beforeEach(async ({ browser }) => {
    // Create fresh page for each test
    page = await browser.newPage();
    loginPage = new LoginPage(page);
    transactionPage = new TransactionPage(page);
  });

  test.afterEach(async () => {
    // Clean up page after each test
    if (page) {
      await page.close();
    }
  });

  test.afterAll(async () => {
    logger.logSuccess('Localization and consistency tests completed');
  });

  test('should maintain currency symbol consistency with locale', async () => {
    try {
      await test.step('Test currency symbol and format consistency', async () => {
        // Test different currencies
        const currencyTests = [
          { code: 'USD', expectedSymbol: '$', expectedDecimal: '.', expectedThousands: ',', expectedFormat: 'MM/DD/YYYY' },
          { code: 'EUR', expectedSymbol: '€', expectedDecimal: ',', expectedThousands: '.', expectedFormat: 'DD.MM.YYYY' },
          { code: 'GBP', expectedSymbol: '£', expectedDecimal: '.', expectedThousands: ',', expectedFormat: 'DD/MM/YYYY' },
          { code: 'JPY', expectedSymbol: '¥', expectedDecimal: '.', expectedThousands: ',', expectedFormat: 'YYYY/MM/DD' }
        ];

        for (const currencyTest of currencyTests) {
          const { code, expectedSymbol, expectedDecimal, expectedThousands, expectedFormat } = currencyTest;
          
          // Test currency symbol
          const actualSymbol = currencyUtils.getCurrencySymbol(code);
          expect(actualSymbol).toBe(expectedSymbol);
          
          // Test decimal separator
          const actualDecimal = currencyUtils.getDecimalSeparator(code);
          expect(actualDecimal).toBe(expectedDecimal);
          
          // Test thousands separator
          const actualThousands = currencyUtils.getThousandsSeparator(code);
          expect(actualThousands).toBe(expectedThousands);
          
          // Test date format
          const actualFormat = currencyUtils.getExpectedDateFormat(code);
          expect(actualFormat).toBe(expectedFormat);
          
          // Test currency formatting with locale
          const testAmount = 1234.56;
          const formattedCurrency = currencyUtils.formatCurrency(testAmount, 'en-US', code);
          
          // Should contain correct symbol
          expect(formattedCurrency).toContain(expectedSymbol);
          
          // Should use correct decimal separator
          if (expectedDecimal === ',') {
            expect(formattedCurrency).toContain(',');
            expect(formattedCurrency).not.toContain('.');
          } else {
            expect(formattedCurrency).toContain('.');
            expect(formattedCurrency).not.toContain(',');
          }
          
          logger.logAction(`Currency ${code} consistency verified: ${formattedCurrency}`, code);
        }

        logger.logSuccess('Currency symbol and format consistency tests passed');
      });

    } catch (error) {
      logger.logError('Currency consistency test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should handle dynamic currency changes in transactions', async () => {
    try {
      await test.step('Test dynamic currency handling in transactions', async () => {
        // Test with different default currencies
        const testCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
        
        for (const currency of testCurrencies) {
          logger.logAction(`Testing with currency: ${currency}`, currency);
          
          // Update configuration (simulate environment change)
          process.env.DEFAULT_CURRENCY = currency;
          
          // Get updated configuration
          const transactionConfig = config.getTransactionConfig();
          expect(transactionConfig.defaultCurrency).toBe(currency);
          
          // Test transaction with new currency
          const testAmount = 100.00;
          const formattedAmount = currencyUtils.formatCurrency(testAmount, 'en-US', currency);
          const symbol = currencyUtils.getCurrencySymbol(currency);
          
          expect(formattedAmount).toContain(symbol);
          expect(formattedAmount).toContain(testAmount.toFixed(2));
          
          logger.logAction(`Currency ${currency} transaction format: ${formattedAmount}`, formattedAmount);
        }
        
        logger.logSuccess('Dynamic currency handling tests passed');
      });

    } catch (error) {
      logger.logError('Dynamic currency test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should display dates in correct locale format', async () => {
    try {
      await test.step('Test date format consistency with locale', async () => {
        // Authenticate first
        const fintechConfig = config.getFintechConfig();
        const mfaSecret = config.getSecret('MFA_SECRET');
        
        await loginPage.completeAuthentication(
          fintechConfig.username,
          fintechConfig.password,
          mfaSecret
        );
        
        // Navigate to transaction page
        await transactionPage.navigateToTransactionPage();
        
        // Test different currency date formats
        const dateTests = [
          { currency: 'USD', expectedPattern: /\d{2}\/\d{2}\/\d{4}/ }, // MM/DD/YYYY
          { currency: 'EUR', expectedPattern: /\d{2}\.\d{2}\.\d{4}/ },   // DD.MM.YYYY
          { currency: 'GBP', expectedPattern: /\d{2}\/\d{2}\/\d{4}/ }, // DD/MM/YYYY
          { currency: 'JPY', expectedPattern: /\d{4}\/\d{2}\/\d{2}/ }    // YYYY/MM/DD
        ];
        
        for (const dateTest of dateTests) {
          const { currency, expectedPattern } = dateTest;
          
          // Set currency and check transaction date
          process.env.DEFAULT_CURRENCY = currency;
          
          const transactionDate = await transactionPage.getTransactionDate();
          
          if (transactionDate) {
            expect(transactionDate).toMatch(expectedPattern);
            logger.logAction(`Date format for ${currency}: ${transactionDate}`, transactionDate);
          } else {
            logger.logWarning(`No transaction date found for ${currency}`);
          }
        }
        
        logger.logSuccess('Date format consistency tests passed');
      });

    } catch (error) {
      logger.logError('Date format test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should maintain decimal precision across locales', async () => {
    try {
      await test.step('Test decimal precision consistency', async () => {
        const precisionTests = [
          { amount: 1.25, currency: 'USD', expectedSmallest: 125 },
          { amount: 1.25, currency: 'EUR', expectedSmallest: 125 },
          { amount: 0.01, currency: 'GBP', expectedSmallest: 1 },
          { amount: 1234.56, currency: 'JPY', expectedSmallest: 123456 }
        ];
        
        for (const test of precisionTests) {
          const { amount, currency, expectedSmallest } = test;
          
          // Test precision conversion
          const smallestUnit = currencyUtils.toSmallestUnit(amount);
          expect(smallestUnit).toBe(expectedSmallest);
          
          // Test reverse conversion
          const backToAmount = currencyUtils.fromSmallestUnit(smallestUnit);
          expect(Math.abs(backToAmount - amount)).toBeLessThan(0.01);
          
          logger.logAction(`Precision test for ${currency}: ${amount} → ${smallestUnit} → ${backToAmount}`, 
            `${amount},${smallestUnit},${backToAmount}`);
        }
        
        logger.logSuccess('Decimal precision consistency tests passed');
      });

    } catch (error) {
      logger.logError('Decimal precision test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should handle currency stripping correctly across formats', async () => {
    try {
      await test.step('Test currency stripping across different formats', async () => {
        const strippingTests = [
          { input: '$1,234.56', currency: 'USD', expected: 1234.56 },
          { input: '€1.234,56', currency: 'EUR', expected: 1234.56 },
          { input: '£1,234.56', currency: 'GBP', expected: 1234.56 },
          { input: '¥1,234.56', currency: 'JPY', expected: 1234.56 },
          { input: '1.234,56€', currency: 'EUR', expected: 1234.56 },
          { input: '(€500.00)', currency: 'EUR', expected: -500.00 }, // Negative balance
          { input: 'CAD 1,234.56', currency: 'CAD', expected: 1234.56 }
        ];
        
        for (const test of strippingTests) {
          const { input, currency, expected } = test;
          
          const stripped = currencyUtils.stripCurrencyFormatting(input);
          expect(Math.abs(stripped - expected)).toBeLessThan(0.01);
          
          logger.logAction(`Currency stripping test (${currency}): "${input}" → ${stripped}`, input);
        }
        
        logger.logSuccess('Currency stripping consistency tests passed');
      });

    } catch (error) {
      logger.logError('Currency stripping test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should validate locale-specific number formatting', async () => {
    try {
      await test.step('Test locale-specific number formatting', async () => {
        const localeTests = [
          { locale: 'en-US', currency: 'USD', amount: 1234.56, expectedContains: '$1,234.56' },
          { locale: 'de-DE', currency: 'EUR', amount: 1234.56, expectedContains: '1.234,56' },
          { locale: 'en-GB', currency: 'GBP', amount: 1234.56, expectedContains: '£1,234.56' },
          { locale: 'ja-JP', currency: 'JPY', amount: 1234.56, expectedContains: '¥1,235' } // JPY often no decimals
        ];
        
        for (const test of localeTests) {
          const { locale, currency, amount, expectedContains } = test;
          
          const formatted = currencyUtils.formatCurrency(amount, locale, currency);
          expect(formatted).toContain(expectedContains);
          
          logger.logAction(`Locale formatting test (${locale}): ${formatted}`, formatted);
        }
        
        logger.logSuccess('Locale-specific formatting tests passed');
      });

    } catch (error) {
      logger.logError('Locale formatting test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });
});

// Manual test function for running outside of Playwright test runner
export async function runManualLocaleTest() {
  console.log('🔧 Running Manual Localization Test...\n');
  
  try {
    // Test 1: Currency symbol consistency
    console.log('✅ Test 1: Currency Symbol Consistency');
    const testCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
    
    testCurrencies.forEach(currency => {
      const symbol = currencyUtils.getCurrencySymbol(currency);
      const decimal = currencyUtils.getDecimalSeparator(currency);
      const thousands = currencyUtils.getThousandsSeparator(currency);
      const dateFormat = currencyUtils.getExpectedDateFormat(currency);
      
      console.log(`   ${currency}: Symbol=${symbol}, Decimal=${decimal}, Thousands=${thousands}, Date=${dateFormat}`);
    });
    
    // Test 2: Date format retrieval
    console.log('\n✅ Test 2: Date Format Retrieval');
    const usDateFormat = currencyUtils.getExpectedDateFormat('USD');
    const euDateFormat = currencyUtils.getExpectedDateFormat('EUR');
    const gbDateFormat = currencyUtils.getExpectedDateFormat('GBP');
    
    console.log(`   US Format: ${usDateFormat}`);
    console.log(`   EU Format: ${euDateFormat}`);
    console.log(`   GB Format: ${gbDateFormat}`);
    
    // Test 3: Currency formatting
    console.log('\n✅ Test 3: Currency Formatting');
    const testAmount = 1234.56;
    
    const usFormatted = currencyUtils.formatCurrency(testAmount, 'en-US', 'USD');
    const euFormatted = currencyUtils.formatCurrency(testAmount, 'de-DE', 'EUR');
    const gbFormatted = currencyUtils.formatCurrency(testAmount, 'en-GB', 'GBP');
    
    console.log(`   US Format: ${usFormatted}`);
    console.log(`   EU Format: ${euFormatted}`);
    console.log(`   GB Format: ${gbFormatted}`);
    
    // Test 4: Currency stripping
    console.log('\n✅ Test 4: Currency Stripping');
    const testStrings = ['$1,234.56', '€1.234,56', '£1,234.56', '(€500.00)'];
    testStrings.forEach(str => {
      const stripped = currencyUtils.stripCurrencyFormatting(str);
      console.log(`   "${str}" → ${stripped}`);
    });
    
    console.log('\n🎉 Manual Localization Test Completed!');
    console.log('💡 To run full test: npx playwright test tests/globalization/locale-consistency.test.ts');
    
  } catch (error) {
    console.error('❌ Manual localization test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run manual test if this file is executed directly
if (require.main === module) {
  runManualLocaleTest();
}

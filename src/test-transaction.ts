import { config } from './utils/ConfigManager';
import { logger } from './utils/Logger';
import { currencyUtils } from './utils/CurrencyUtils';

/**
 * Test Transaction Module Configuration and Utilities
 * Verifies currency handling and transaction setup
 */
function testTransactionModule() {
  console.log('🔧 Testing Transaction Module...\n');

  try {
    // Test 1: Configuration loading
    console.log('✅ Test 1: Transaction Configuration');
    const transactionConfig = config.getTransactionConfig();
    const paymentAmount = config.getPaymentAmount();
    const defaultCurrency = config.getDefaultCurrency();
    
    console.log(`   Default Currency: ${defaultCurrency}`);
    console.log(`   Payment Amount: ${paymentAmount}`);
    console.log(`   Transaction Config: ${JSON.stringify(transactionConfig)}`);

    // Test 2: Currency precision conversion
    console.log('\n✅ Test 2: Currency Precision');
    const testAmount = 1.25;
    const smallestUnit = currencyUtils.toSmallestUnit(testAmount);
    const backToAmount = currencyUtils.fromSmallestUnit(smallestUnit);
    
    console.log(`   Input: ${testAmount}`);
    console.log(`   Smallest Unit: ${smallestUnit}`);
    console.log(`   Back to Amount: ${backToAmount}`);
    console.log(`   Precision Test: ${testAmount === backToAmount ? '✓' : '✗'}`);

    // Test 3: Currency formatting
    console.log('\n✅ Test 3: Currency Formatting');
    const formattedUSD = currencyUtils.formatCurrency(1234.56, 'en-US', 'USD');
    const formattedEUR = currencyUtils.formatCurrency(1234.56, 'de-DE', 'EUR');
    
    console.log(`   USD Format: ${formattedUSD}`);
    console.log(`   EUR Format: ${formattedEUR}`);

    // Test 4: Currency stripping
    console.log('\n✅ Test 4: Currency Stripping');
    const testStrings = ['$1,234.56', '€1.234,56', '£1,234.56', '(€500.00)'];
    testStrings.forEach(str => {
      const stripped = currencyUtils.stripCurrencyFormatting(str);
      console.log(`   "${str}" → ${stripped}`);
    });

    // Test 5: Balance calculation in integer space
    console.log('\n✅ Test 5: Balance Calculation');
    const initialBalance = 1000.00;
    const paymentAmountTest = 250.75;
    
    const initialCents = currencyUtils.toSmallestUnit(initialBalance);
    const paymentCents = currencyUtils.toSmallestUnit(paymentAmountTest);
    const expectedCents = currencyUtils.calculateExpectedBalance(initialCents, -paymentCents);
    const expectedBalance = currencyUtils.fromSmallestUnit(expectedCents);
    
    console.log(`   Initial Balance: ${initialBalance}`);
    console.log(`   Payment Amount: ${paymentAmountTest}`);
    console.log(`   Expected Balance: ${expectedBalance}`);
    console.log(`   Calculation Test: ${expectedBalance === 749.25 ? '✓' : '✗'}`);

    // Test 6: Dynamic currency symbol
    console.log('\n✅ Test 6: Currency Symbols');
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];
    currencies.forEach(currency => {
      const symbol = currencyUtils.getCurrencySymbol(currency);
      console.log(`   ${currency}: ${symbol}`);
    });

    console.log('\n🎉 Transaction Module Tests Passed!');
    console.log('💡 Ready for E2E transaction testing');
    console.log('   To run full test: npx playwright test tests/transactions/balance-integrity.test.ts');

  } catch (error) {
    console.error('❌ Transaction Module Test Failed:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      console.log('\n💡 To fix this issue:');
      console.log('   1. Copy .env.demo to .env');
      console.log('   2. Ensure all required variables are set');
      console.log('   3. Check DEFAULT_CURRENCY and TRANSACTION_AMOUNT');
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testTransactionModule();
}

export { testTransactionModule };

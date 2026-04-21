import { logger } from './utils/Logger';

/**
 * Test file to verify Logger functionality
 * Run this file to test the secure logging system
 */
function testLogger() {
  console.log('🔧 Testing Logger Security Features...\n');

  // Test 1: Basic logging without sensitive data
  console.log('✅ Test 1: Basic logging');
  logger.logAction('User initiated login process');
  logger.logSuccess('Authentication successful');
  logger.logWarning('Rate limit approaching threshold');
  logger.logError('API request failed');

  // Test 2: Logging with sensitive data masking
  console.log('\n✅ Test 2: Sensitive data masking');
  const password = 'SuperSecretPassword123!';
  const apiKey = 'sk-1234567890abcdef';
  
  logger.logAction(`Login attempt with password: ${password}`, password);
  logger.logAction(`API call with key: ${apiKey}`, apiKey);
  logger.logSecurity(`Secure operation completed with token: ${apiKey}`, apiKey);

  // Test 3: Login attempt logging
  console.log('\n✅ Test 3: Login attempt logging');
  logger.logLoginAttempt('john.doe@example.com', true);
  logger.logLoginAttempt('jane.doe@example.com', false, 'Invalid credentials');

  // Test 4: API access logging
  console.log('\n✅ Test 4: API access logging');
  logger.logApiAccess('/api/accounts', 'GET', 200);
  logger.logApiAccess('/api/transfer', 'POST', 400);
  logger.logApiAccess('/api/auth/refresh', 'POST', 401);

  // Test 5: Multiple occurrences of sensitive data
  console.log('\n✅ Test 5: Multiple sensitive data occurrences');
  const sensitiveValue = 'ABC123XYZ';
  logger.logAction(`Processing transaction with ID: ${sensitiveValue} and reference: ${sensitiveValue}`, sensitiveValue);

  console.log('\n🎉 Logger security tests completed!');
  console.log('💡 Notice how all sensitive data is replaced with ******** in the logs');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testLogger();
}

export { testLogger };

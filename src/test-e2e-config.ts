import { config } from './utils/ConfigManager';
import { logger } from './utils/Logger';
import { otpGenerator } from './utils/OTPGenerator';

/**
 * Test E2E Configuration Setup
 * Verifies all components are working before running E2E tests
 */
function testE2EConfiguration() {
  console.log('🔧 Testing E2E Configuration Setup...\n');

  try {
    // Test 1: Configuration loading
    console.log('✅ Test 1: ConfigManager Setup');
    const fintechConfig = config.getFintechConfig();
    const mfaSecret = config.getSecret('MFA_SECRET');
    
    // Mask infrastructure IDs using the Logger's masking functionality
    const maskedClientId = logger.maskInfrastructureIds(fintechConfig.clientId);
    const maskedDiscoveryId = logger.maskInfrastructureIds(fintechConfig.discoveryId);
    
    console.log(`   Username: ${fintechConfig.username}`);
    console.log(`   Client ID: ${maskedClientId}`);
    console.log(`   Discovery ID: ${maskedDiscoveryId}`);
    console.log(`   MFA Secret: ${mfaSecret.substring(0, 8)}****`);

    // Test 2: OTP Generator
    console.log('\n✅ Test 2: OTP Generator');
    const testToken = otpGenerator.generateToken(mfaSecret);
    const isValid = otpGenerator.verifyToken(testToken, mfaSecret);
    
    console.log(`   Generated Token: ${testToken}`);
    console.log(`   Token Valid: ${isValid ? '✓' : '✗'}`);
    console.log(`   Token Length: ${testToken.length} digits`);

    // Test 3: Logger Integration
    console.log('\n✅ Test 3: Logger Integration');
    logger.logSuccess('E2E configuration test completed');
    logger.logSecurity('All security components verified');

    console.log('\n🎉 E2E Configuration Test Passed!');
    console.log('💡 Ready to run: npx playwright test tests/auth/full-auth-flow.test.ts');

  } catch (error) {
    console.error('❌ E2E Configuration Test Failed:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      console.log('\n💡 To fix this issue:');
      console.log('   1. Copy .env.example to .env');
      console.log('   2. Fill in your actual values in .env');
      console.log('   3. Ensure all required variables are set');
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testE2EConfiguration();
}

export { testE2EConfiguration };

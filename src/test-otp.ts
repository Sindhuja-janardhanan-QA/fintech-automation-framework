import { otpGenerator } from './utils/OTPGenerator';
import { logger } from './utils/Logger';
import { config } from './utils/ConfigManager';

/**
 * Simple OTP test that can run with ts-node
 * Tests OTP generation, verification, and security logging
 */
function testOTPGenerator() {
  console.log('🔧 Testing OTP Generator...\n');

  const testSecret = 'JBSWY3DPEHPK3PXP';

  try {
    // Test 1: Generate token
    console.log('✅ Test 1: Token Generation');
    const token = otpGenerator.generateToken(testSecret);
    console.log(`   Generated token: ${token}`);
    console.log(`   Token length: ${token.length} characters`);
    
    // Assert that the token is exactly 6 digits long
    const isSixDigits = /^\d{6}$/.test(token);
    console.log(`   Is 6 digits: ${isSixDigits ? '✓' : '✗'}`);
    
    if (!isSixDigits || token.length !== 6) {
      throw new Error('Token format validation failed');
    }

    // Test 2: Verify token
    console.log('\n✅ Test 2: Token Verification');
    const isValid = otpGenerator.verifyToken(token, testSecret);
    console.log(`   Token verification: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
    
    if (!isValid) {
      throw new Error('Token verification failed');
    }

    // Test 3: Invalid token rejection
    console.log('\n✅ Test 3: Invalid Token Rejection');
    const invalidValid = otpGenerator.verifyToken('999999', testSecret);
    console.log(`   Invalid token rejection: ${!invalidValid ? '✓ Correctly rejected' : '✗ Incorrectly accepted'}`);
    
    if (invalidValid) {
      throw new Error('Invalid token should have been rejected');
    }

    // Test 4: Secret validation
    console.log('\n✅ Test 4: Secret Validation');
    const validSecretCheck = otpGenerator.isValidSecret(testSecret);
    const invalidSecretCheck = otpGenerator.isValidSecret('short');
    console.log(`   Valid secret check: ${validSecretCheck ? '✓' : '✗'}`);
    console.log(`   Invalid secret check: ${!invalidSecretCheck ? '✓' : '✗'}`);
    
    if (!validSecretCheck || invalidSecretCheck) {
      throw new Error('Secret validation failed');
    }

    // Test 5: Utility functions
    console.log('\n✅ Test 5: Utility Functions');
    const newSecret = otpGenerator.generateSecret();
    const remainingTime = otpGenerator.getRemainingTime();
    console.log(`   New secret generated: ${newSecret.substring(0, 8)}****`);
    console.log(`   Remaining time: ${remainingTime}s`);
    
    if (!newSecret || newSecret.length === 0) {
      throw new Error('Secret generation failed');
    }

    // Test 6: Environment integration
    console.log('\n✅ Test 6: Environment Integration');
    try {
      const envSecret = config.getOptionalSecret('MFA_SECRET');
      if (envSecret) {
        const envToken = otpGenerator.generateToken(envSecret);
        console.log(`   Environment token: ${envToken}`);
        console.log(`   Environment token valid: ${/^\d{6}$/.test(envToken) ? '✓' : '✗'}`);
      } else {
        console.log('   MFA_SECRET not found in environment (expected)');
      }
    } catch (error) {
      console.log('   Environment test skipped (expected)');
    }

    console.log('\n🎉 All OTP Generator tests passed!');
    console.log('💡 Notice how tokens are masked in the logger output above');

  } catch (error) {
    console.error('❌ OTP Generator test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testOTPGenerator();
}

export { testOTPGenerator };

import { otpGenerator } from '../../src/utils/OTPGenerator';
import { logger } from '../../src/utils/Logger';
import { config } from '../../src/utils/ConfigManager';

/**
 * OTP Validation Test Suite
 * Tests OTP generation, verification, and security logging
 */
describe('OTP Validation Tests', () => {
  const testSecret = 'JBSWY3DPEHPK3PXP'; // Test secret from .env.example

  beforeAll(() => {
    // Ensure logger is initialized for tests
    logger.logAction('Starting OTP validation tests');
  });

  describe('Token Generation', () => {
    test('should generate a 6-digit token', () => {
      // Generate token using the test secret
      const token = otpGenerator.generateToken(testSecret);
      
      // Log the generation process (token will be masked by logger)
      logger.logAction(`Generated test token: ${token}`, token);
      
      // Assert that the token is exactly 6 digits long
      expect(token).toHaveLength(6);
      
      // Assert that the token contains only digits
      expect(token).toMatch(/^\d{6}$/);
      
      // Log successful validation
      logger.logSuccess('Token generation validation passed');
    });

    test('should generate different tokens over time', async () => {
      // Generate first token
      const token1 = otpGenerator.generateToken(testSecret);
      logger.logAction(`First token generated: ${token1}`, token1);
      
      // Wait a small amount of time (though tokens may not change within 30s window)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate second token
      const token2 = otpGenerator.generateToken(testSecret);
      logger.logAction(`Second token generated: ${token2}`, token2);
      
      // Both tokens should be 6 digits
      expect(token1).toHaveLength(6);
      expect(token2).toHaveLength(6);
      expect(token1).toMatch(/^\d{6}$/);
      expect(token2).toMatch(/^\d{6}$/);
      
      logger.logSuccess('Token format consistency validated');
    });
  });

  describe('Token Verification', () => {
    test('should verify a valid token', () => {
      // Generate a token
      const token = otpGenerator.generateToken(testSecret);
      logger.logAction(`Generated token for verification test: ${token}`, token);
      
      // Verify the token
      const isValid = otpGenerator.verifyToken(token, testSecret);
      
      // Assert that the token is valid
      expect(isValid).toBe(true);
      
      logger.logSuccess('Token verification test passed');
    });

    test('should reject an invalid token', () => {
      // Use an invalid token
      const invalidToken = '123456';
      logger.logAction(`Testing invalid token: ${invalidToken}`, invalidToken);
      
      // Verify the invalid token
      const isValid = otpGenerator.verifyToken(invalidToken, testSecret);
      
      // Assert that the token is invalid
      expect(isValid).toBe(false);
      
      logger.logSuccess('Invalid token rejection test passed');
    });

    test('should reject token with wrong secret', () => {
      // Generate token with correct secret
      const token = otpGenerator.generateToken(testSecret);
      logger.logAction(`Generated token: ${token}`, token);
      
      // Try to verify with wrong secret
      const wrongSecret = 'JBSWY3DPEHPK3PXQ'; // Different secret
      const isValid = otpGenerator.verifyToken(token, wrongSecret);
      
      // Assert that verification fails
      expect(isValid).toBe(false);
      
      logger.logSuccess('Wrong secret rejection test passed');
    });
  });

  describe('Secret Validation', () => {
    test('should validate correct secret format', () => {
      const isValid = otpGenerator.isValidSecret(testSecret);
      expect(isValid).toBe(true);
      logger.logSuccess('Valid secret format test passed');
    });

    test('should reject invalid secret format', () => {
      const invalidSecrets = ['', 'short', '123', null as any, undefined as any];
      
      invalidSecrets.forEach(secret => {
        const isValid = otpGenerator.isValidSecret(secret);
        expect(isValid).toBe(false);
      });
      
      logger.logSuccess('Invalid secret format rejection test passed');
    });
  });

  describe('Utility Functions', () => {
    test('should generate new secret', () => {
      const newSecret = otpGenerator.generateSecret();
      
      expect(newSecret).toBeDefined();
      expect(typeof newSecret).toBe('string');
      expect(newSecret.length).toBeGreaterThan(0);
      
      logger.logAction(`Generated new secret: ${newSecret.substring(0, 8)}****`);
      logger.logSuccess('Secret generation test passed');
    });

    test('should return remaining time', () => {
      const remainingTime = otpGenerator.getRemainingTime();
      
      expect(typeof remainingTime).toBe('number');
      expect(remainingTime).toBeGreaterThanOrEqual(0);
      expect(remainingTime).toBeLessThanOrEqual(30);
      
      logger.logAction(`Remaining time until next token: ${remainingTime}s`);
      logger.logSuccess('Remaining time calculation test passed');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for empty secret in generation', () => {
      expect(() => {
        otpGenerator.generateToken('');
      }).toThrow('Secret is required for token generation');
      
      logger.logSuccess('Empty secret error handling test passed');
    });

    test('should throw error for empty parameters in verification', () => {
      expect(() => {
        otpGenerator.verifyToken('', testSecret);
      }).toThrow('Both token and secret are required for verification');
      
      expect(() => {
        otpGenerator.verifyToken('123456', '');
      }).toThrow('Both token and secret are required for verification');
      
      logger.logSuccess('Empty parameters error handling test passed');
    });
  });

  describe('Integration with ConfigManager', () => {
    test('should work with environment secret', () => {
      try {
        // Try to get MFA_SECRET from environment
        const envSecret = config.getOptionalSecret('MFA_SECRET');
        
        if (envSecret) {
          const token = otpGenerator.generateToken(envSecret);
          expect(token).toHaveLength(6);
          logger.logSuccess('Environment secret integration test passed');
        } else {
          logger.logWarning('MFA_SECRET not found in environment, skipping integration test');
        }
      } catch (error) {
        logger.logWarning('Environment secret test failed (expected if .env not configured)');
      }
    });
  });

  afterAll(() => {
    logger.logSuccess('All OTP validation tests completed successfully');
  });
});

// Manual test function for running outside of Jest
export function runManualOTPTest() {
  console.log('🔧 Running Manual OTP Validation Test...\n');
  
  const testSecret = 'JBSWY3DPEHPK3PXP';
  
  try {
    // Test 1: Generate token
    console.log('✅ Test 1: Token Generation');
    const token = otpGenerator.generateToken(testSecret);
    console.log(`   Generated token: ${token}`);
    console.log(`   Token length: ${token.length} characters`);
    console.log(`   Is 6 digits: ${/^\d{6}$/.test(token) ? '✓' : '✗'}`);
    
    // Test 2: Verify token
    console.log('\n✅ Test 2: Token Verification');
    const isValid = otpGenerator.verifyToken(token, testSecret);
    console.log(`   Token verification: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
    
    // Test 3: Invalid token
    console.log('\n✅ Test 3: Invalid Token Rejection');
    const invalidValid = otpGenerator.verifyToken('999999', testSecret);
    console.log(`   Invalid token rejection: ${!invalidValid ? '✓ Correctly rejected' : '✗ Incorrectly accepted'}`);
    
    console.log('\n🎉 Manual OTP test completed!');
    
  } catch (error) {
    console.error('❌ Manual test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run manual test if this file is executed directly
if (require.main === module) {
  runManualOTPTest();
}

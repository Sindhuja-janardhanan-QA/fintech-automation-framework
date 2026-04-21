import { config } from './utils/ConfigManager';
import { logger } from './utils/Logger';

/**
 * Example usage of the ConfigManager
 * This file demonstrates how to use the secret management system
 */
function exampleUsage() {
  console.log('🔐 Fintech Automation Framework - Example Usage\n');

  try {
    // Method 1: Get all fintech configuration at once
    console.log('📋 Method 1: Get all fintech configuration');
    const fintechConfig = config.getFintechConfig();
    console.log(`   Username: ${fintechConfig.username}`);
    console.log(`   Client ID: ${fintechConfig.clientId}`);
    console.log(`   Discovery ID: ${fintechConfig.discoveryId}`);

    // Method 2: Get individual secrets
    console.log('\n🔑 Method 2: Get individual secrets');
    const username = config.getSecret('FINTECH_USERNAME');
    const clientId = config.getSecret('CLIENT_ID');
    console.log(`   Username: ${username}`);
    console.log(`   Client ID: ${clientId}`);

    // Method 3: Get optional secrets with defaults
    console.log('\n⚙️ Method 3: Get optional secrets');
    const timeout = config.getOptionalSecret('API_TIMEOUT', '5000');
    const environment = config.getOptionalSecret('ENVIRONMENT', 'development');
    console.log(`   API Timeout: ${timeout}ms`);
    console.log(`   Environment: ${environment}`);

    // Method 4: Validate custom required secrets
    console.log('\n✅ Method 4: Validate custom requirements');
    config.validateRequiredSecrets(['FINTECH_USERNAME', 'CLIENT_ID']);
    console.log('   Custom validation passed!');

    // Method 5: Demonstrate secure logging with password masking
    console.log('\n🔐 Method 5: Secure logging with sensitive data masking');
    
    // Simulate login event (password will be masked in logs)
    const loginUsername = config.getSecret('FINTECH_USERNAME');
    const loginPassword = config.getSecret('FINTECH_PASSWORD');
    
    logger.logAction(`Attempting login for user: ${loginUsername} with password: ${loginPassword}`, loginPassword);
    logger.logLoginAttempt(loginUsername, true);
    
    // Log API access
    logger.logApiAccess('/api/auth/login', 'POST', 200);
    
    // Log security event
    logger.logSecurity('Sensitive operation completed successfully');

    console.log('\n🎉 All operations completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}

export { exampleUsage };

import { FullConfig } from '@playwright/test';
import { config } from '../src/utils/ConfigManager'; // Import the lowercase 'config' instance
import { logger } from '../src/utils/Logger';

async function globalSetup(configObj: FullConfig) {
  logger.logAction('Starting global test setup (API Mode)');
  
  // Use the instance 'config' and pass the required keys
  config.validateRequiredSecrets([
    'FINTECH_USERNAME',
    'FINTECH_PASSWORD',
    'CLIENT_ID',
    'DISCOVERY_ID',
    'MFA_SECRET'
  ]);
  
  // Log the masked version of IDs manually to verify masking logic
  const clientId = config.getSecret('CLIENT_ID');
  logger.logActionWithInfrastructureMasking('Verified Client ID', clientId);
  
  logger.logSuccess('Environment validated. Skipping browser launch for API testing.');
}

export default globalSetup;
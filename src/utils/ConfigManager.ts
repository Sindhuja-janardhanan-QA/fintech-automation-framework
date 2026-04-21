import dotenv from 'dotenv';
import path from 'path';
import { logger } from './Logger';

/**
 * Configuration Manager for secure secret management
 * Loads environment variables and provides secure access to secrets
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private isLoaded: boolean = false;

  private constructor() {
    this.loadEnvironment();
  }

  /**
   * Get singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load environment variables from .env file
   */
  private loadEnvironment(): void {
    if (this.isLoaded) return;

    try {
      // Load .env file from the project root
      const envPath = path.resolve(process.cwd(), '.env');
      dotenv.config({ path: envPath });
      this.isLoaded = true;
    } catch (error) {
      throw new Error(`Failed to load environment variables: ${error}`);
    }
  }

  /**
   * Get a secret value by key
   * @param key - The environment variable key
   * @returns The value of the environment variable
   * @throws Error if the required secret is missing
   */
  public getSecret(key: string): string {
    const value = process.env[key];
    
    if (!value) {
      throw new Error(`Required secret '${key}' is missing from environment variables. Please check your .env file.`);
    }
    
    return value;
  }

  /**
   * Get an optional secret value by key
   * @param key - The environment variable key
   * @param defaultValue - Default value if the secret is missing
   * @returns The value of the environment variable or default value
   */
  public getOptionalSecret(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * Validate that all required secrets are present
   * @param requiredKeys - Array of required secret keys
   * @throws Error if any required secret is missing
   */
  public validateRequiredSecrets(requiredKeys: string[]): void {
    const missingKeys: string[] = [];
    
    for (const key of requiredKeys) {
      if (!process.env[key]) {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0) {
      // Use secure logging for infrastructure IDs
      const infrastructureIds = requiredKeys.filter(key => 
        ['CLIENT_ID', 'DISCOVERY_ID'].includes(key)
      );
      
      if (infrastructureIds.length > 0) {
        // Log infrastructure ID validation failure with masking
        logger.logAction('Infrastructure ID validation failed', missingKeys.join(', '));
      }
      
      throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}. Please check your .env file and ensure all required secrets are set.`);
    }
  }

  /**
   * Get all fintech-related configuration values
   * @returns Object containing all fintech configuration
   */
  public getFintechConfig(): {
    username: string;
    password: string;
    clientId: string;
    discoveryId: string;
  } {
    this.validateRequiredSecrets([
      'FINTECH_USERNAME',
      'FINTECH_PASSWORD',
      'CLIENT_ID',
      'DISCOVERY_ID'
    ]);

    return {
      username: this.getSecret('FINTECH_USERNAME'),
      password: this.getSecret('FINTECH_PASSWORD'),
      clientId: this.getSecret('CLIENT_ID'),
      discoveryId: this.getSecret('DISCOVERY_ID')
    };
  }

  /**
   * Get transaction configuration values
   * @returns Object containing transaction configuration
   */
  public getTransactionConfig(): {
    defaultCurrency: string;
    transactionAmount: number;
  } {
    const defaultCurrency = this.getOptionalSecret('DEFAULT_CURRENCY', 'USD') || 'USD';
    const transactionAmountStr = this.getOptionalSecret('TRANSACTION_AMOUNT', '100.00') || '100.00';
    const transactionAmount = parseFloat(transactionAmountStr);

    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      throw new Error(`Invalid TRANSACTION_AMOUNT: ${transactionAmountStr}. Must be a positive number.`);
    }

    return {
      defaultCurrency: defaultCurrency as string,
      transactionAmount
    };
  }

  /**
   * Get payment amount for testing
   * @returns Payment amount as number
   */
  public getPaymentAmount(): number {
    const config = this.getTransactionConfig();
    return config.transactionAmount;
  }

  /**
   * Get default currency
   * @returns Default currency code
   */
  public getDefaultCurrency(): string {
    return this.getOptionalSecret('DEFAULT_CURRENCY', 'USD') || 'USD';
  }
}

// Export singleton instance for easy access
export const config = ConfigManager.getInstance();

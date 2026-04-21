import { authenticator } from 'otplib';
import { logger } from './Logger';

/**
 * OTP Generator utility for MFA/OTP functionality
 * Uses otplib for TOTP (Time-based One-Time Password) generation and verification
 */
export class OTPGenerator {
  private static instance: OTPGenerator;

  private constructor() {
    // Configure otplib settings for security
    authenticator.options = {
      window: 1, // Allow 1 step before/after for clock skew tolerance
      time: 30,  // 30-second time window
      digits: 6  // 6-digit codes (algorithm defaults to sha1)
    };
  }

  /**
   * Get singleton instance of OTPGenerator
   */
  public static getInstance(): OTPGenerator {
    if (!OTPGenerator.instance) {
      OTPGenerator.instance = new OTPGenerator();
    }
    return OTPGenerator.instance;
  }

  /**
   * Generate a 6-digit TOTP token using the provided secret
   * @param secret - The secret key for OTP generation
   * @returns 6-digit OTP token as string
   */
  public generateToken(secret: string): string {
    try {
      if (!secret) {
        throw new Error('Secret is required for token generation');
      }

      const token = authenticator.generate(secret);
      
      // Log the generation process (token will be masked by logger)
      logger.logAction(`Generated OTP token: ${token}`, token);
      
      return token;
    } catch (error) {
      logger.logError('Failed to generate OTP token', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Verify a token against the provided secret
   * @param token - The OTP token to verify
   * @param secret - The secret key used for generation
   * @returns boolean indicating if the token is valid
   */
  public verifyToken(token: string, secret: string): boolean {
    try {
      if (!token || !secret) {
        throw new Error('Both token and secret are required for verification');
      }

      const isValid = authenticator.verify({ token, secret });
      
      // Log verification attempt (token will be masked by logger)
      logger.logAction(`OTP verification attempt: ${token}`, token);
      logger.logAction(`Verification result: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      
      return isValid;
    } catch (error) {
      logger.logError('Failed to verify OTP token', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Generate a random base32 secret for new MFA setup
   * @returns Base32 encoded secret string
   */
  public generateSecret(): string {
    try {
      const secret = authenticator.generateSecret();
      logger.logSecurity('Generated new MFA secret for user setup');
      return secret;
    } catch (error) {
      logger.logError('Failed to generate MFA secret', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Get the remaining time until the next token refresh
   * @returns seconds remaining until next token
   */
  public getRemainingTime(): number {
    try {
      const timeStep = 30; // 30 seconds
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = timeStep - (currentTime % timeStep);
      return remainingTime;
    } catch (error) {
      logger.logError('Failed to calculate remaining time', error instanceof Error ? error : String(error));
      return 0;
    }
  }

  /**
   * Validate if a secret is properly formatted for OTP
   * @param secret - The secret to validate
   * @returns boolean indicating if secret is valid
   */
  public isValidSecret(secret: string): boolean {
    try {
      if (!secret || typeof secret !== 'string') {
        return false;
      }
      
      // Basic validation - otplib will handle detailed validation
      return secret.length >= 16; // Minimum length for base32 secrets
    } catch (error) {
      logger.logError('Secret validation failed', error instanceof Error ? error : String(error));
      return false;
    }
  }

  /**
   * Generate a token with automatic retry on edge cases
   * @param secret - The secret key for OTP generation
   * @param maxRetries - Maximum number of retries (default: 3)
   * @returns 6-digit OTP token as string
   */
  public generateTokenWithRetry(secret: string, maxRetries: number = 3): string {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = this.generateToken(secret);
        if (attempt > 1) {
          logger.logSuccess(`OTP token generated successfully on attempt ${attempt}`);
        }
        return token;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.logWarning(`OTP generation attempt ${attempt} failed`, lastError.message);
        
        if (attempt < maxRetries) {
          // Small delay before retry
          setTimeout(() => {}, 100);
        }
      }
    }
    
    throw lastError || new Error('Failed to generate OTP token after maximum retries');
  }
}

// Export singleton instance for easy access
export const otpGenerator = OTPGenerator.getInstance();

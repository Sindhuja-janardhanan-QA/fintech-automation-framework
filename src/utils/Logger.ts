/**
 * Security-focused Logger utility for the Fintech Automation Framework
 * Provides secure logging with automatic sensitive data masking
 */

export enum LogLevel {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY'
}

export class Logger {
  private static instance: Logger;

  private constructor() {}

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log an action with optional sensitive data masking
   * @param message - The log message
   * @param sensitiveData - Optional sensitive data to be masked
   * @param level - Log level (default: INFO)
   */
  public logAction(
    message: string, 
    sensitiveData?: string, 
    level: LogLevel = LogLevel.INFO
  ): void {
    try {
      const timestamp = new Date().toISOString();
      const maskedMessage = this.maskSensitiveData(message, sensitiveData);
      
      const logEntry = this.formatLogEntry(timestamp, level, maskedMessage);
      
      // Output to console with appropriate formatting
      this.outputLog(logEntry, level);
      
    } catch (error) {
      logger.logError('Failed to log action', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Log an action with infrastructure ID masking
   * @param message - The log message
   * @param sensitiveData - Optional sensitive data to be masked
   * @param level - Log level (default: INFO)
   */
  public logActionWithInfrastructureMasking(
    message: string, 
    sensitiveData?: string, 
    level: LogLevel = LogLevel.INFO
  ): void {
    try {
      const timestamp = new Date().toISOString();
      
      // Mask infrastructure IDs automatically
      const infrastructureIds = ['CLIENT_ID', 'DISCOVERY_ID'];
      let maskedMessage = message;
      
      if (sensitiveData) {
        // Check if message contains infrastructure IDs and mask them
        infrastructureIds.forEach(id => {
          if (sensitiveData.includes(id)) {
            const regex = new RegExp(`(${id})`, 'gi');
            maskedMessage = maskedMessage.replace(regex, (match) => {
              return match ? match.split('').map(() => '********').join('') : match;
            });
          }
        });
      }
      
      // Apply standard sensitive data masking
      if (!maskedMessage.includes('********')) {
        maskedMessage = this.maskSensitiveData(maskedMessage, sensitiveData);
      }
      
      const logEntry = this.formatLogEntry(timestamp, level, maskedMessage);
      
      // Output to console with appropriate formatting
      this.outputLog(logEntry, level);
      
    } catch (error) {
      logger.logError('Failed to log action with infrastructure masking', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Public method to mask infrastructure IDs
   * @param data - Data to mask
   * @returns Masked data
   */
  public maskInfrastructureIds(data: string): string {
    // Simple approach: if the data looks like an infrastructure ID, mask it
    // Check for patterns that look like infrastructure IDs
    const infrastructurePatterns = [
      /demo-client-id-\d+/gi,
      /demo-discovery-id-\d+/gi,
      /[a-zA-Z0-9-]+-[a-zA-Z0-9-]+/gi // General ID pattern
    ];
    
    let maskedData = data;
    
    infrastructurePatterns.forEach(pattern => {
      if (pattern.test(data)) {
        maskedData = '********';
      }
    });
    
    return maskedData;
  }

  /**
   * Log successful operation
   */
  public logSuccess(message: string, sensitiveData?: string): void {
    this.logAction(message, sensitiveData, LogLevel.SUCCESS);
  }

  /**
   * Log security-related event
   */
  public logSecurity(message: string, sensitiveData?: string): void {
    this.logAction(message, sensitiveData, LogLevel.SECURITY);
  }

  /**
   * Log warning
   */
  public logWarning(message: string, sensitiveData?: string): void {
    this.logAction(message, sensitiveData, LogLevel.WARNING);
  }

  /**
   * Log error
   */
  public logError(message: string, error?: Error | string): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.logAction(`${message}: ${errorMessage}`, undefined, LogLevel.ERROR);
  }

  /**
   * Mask sensitive data in log messages
   * @param message - The original message
   * @param sensitiveData - Sensitive data to mask
   * @returns Message with sensitive data masked
   */
  private maskSensitiveData(message: string, sensitiveData?: string): string {
    if (!sensitiveData) {
      return message;
    }

    // Replace all occurrences of sensitive data with asterisks
    let maskedMessage = message;
    
    // Case-sensitive replacement for exact matches
    if (message.includes(sensitiveData)) {
      maskedMessage = message.replace(new RegExp(this.escapeRegExp(sensitiveData), 'g'), '********');
    }
    
    return maskedMessage;
  }

  /**
   * Escape special regex characters in sensitive data
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Format log entry with timestamp and level
   */
  private formatLogEntry(timestamp: string, level: LogLevel, message: string): string {
    return `[${timestamp}] [${level}] ${message}`;
  }

  /**
   * Output log entry with appropriate console method
   */
  private outputLog(logEntry: string, level: LogLevel): void {
    switch (level) {
      case LogLevel.SUCCESS:
        console.log(`✅ ${logEntry}`);
        break;
      case LogLevel.WARNING:
        console.warn(`⚠️  ${logEntry}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${logEntry}`);
        break;
      case LogLevel.SECURITY:
        console.log(`🔐 ${logEntry}`);
        break;
      case LogLevel.INFO:
      default:
        console.log(`ℹ️  ${logEntry}`);
        break;
    }
  }

  /**
   * Log login attempt (security-focused)
   */
  public logLoginAttempt(username: string, success: boolean, error?: string): void {
    if (success) {
      this.logSecurity(`User login successful`, username);
    } else {
      this.logSecurity(`User login failed: ${error}`, username);
    }
  }

  /**
   * Log API access with rate limiting awareness
   */
  public logApiAccess(endpoint: string, method: string, statusCode: number): void {
    const message = `API ${method} ${endpoint} - Status: ${statusCode}`;
    
    if (statusCode >= 400) {
      this.logError(message);
    } else {
      this.logSuccess(message);
    }
  }
}

// Export singleton instance for easy access
export const logger = Logger.getInstance();

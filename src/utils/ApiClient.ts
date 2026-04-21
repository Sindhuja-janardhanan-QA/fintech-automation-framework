import { request, APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from './Logger';
import { config } from './ConfigManager';

/**
 * API Client for Fintech Transaction Testing
 * Uses Playwright's request context for secure API calls
 */
export class ApiClient {
  private context: APIRequestContext;

  constructor(context: APIRequestContext) {
    this.context = context;
  }

  /**
   * Make a GET request to the API
   * @param endpoint - API endpoint (e.g., '/transactions')
   * @param options - Request options
   * @returns API response
   */
  async get(endpoint: string, options: { headers?: Record<string, string> } = {}): Promise<APIResponse> {
    try {
      logger.logAction(`Making GET request to ${endpoint}`, endpoint);

      const response = await this.context.get(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      this.logApiResponse(response, 'GET', endpoint);
      return response;
    } catch (error) {
      logger.logError(`GET request to ${endpoint} failed`, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Make a POST request to the API
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns API response
   */
  async post(endpoint: string, data: any, options: { headers?: Record<string, string> } = {}): Promise<APIResponse> {
    try {
      // Mask sensitive data in request body
      const maskedData = this.maskSensitiveData(data);
      logger.logAction(`Making POST request to ${endpoint}`, JSON.stringify(maskedData));

      const response = await this.context.post(endpoint, {
        data: maskedData,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      this.logApiResponse(response, 'POST', endpoint);
      return response;
    } catch (error) {
      logger.logError(`POST request to ${endpoint} failed`, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Make a PUT request to the API
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns API response
   */
  async put(endpoint: string, data: any, options: { headers?: Record<string, string> } = {}): Promise<APIResponse> {
    try {
      const maskedData = this.maskSensitiveData(data);
      logger.logAction(`Making PUT request to ${endpoint}`, JSON.stringify(maskedData));

      const response = await this.context.put(endpoint, {
        data: maskedData,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      this.logApiResponse(response, 'PUT', endpoint);
      return response;
    } catch (error) {
      logger.logError(`PUT request to ${endpoint} failed`, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Make a DELETE request to the API
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns API response
   */
  async delete(endpoint: string, options: { headers?: Record<string, string> } = {}): Promise<APIResponse> {
    try {
      logger.logAction(`Making DELETE request to ${endpoint}`, endpoint);

      const response = await this.context.delete(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      this.logApiResponse(response, 'DELETE', endpoint);
      return response;
    } catch (error) {
      logger.logError(`DELETE request to ${endpoint} failed`, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Mask sensitive data in request body
   * @param data - Data to mask
   * @returns Masked data
   */
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const maskedData = { ...data };
    
    // Mask CLIENT_ID if present
    if (maskedData.CLIENT_ID) {
      maskedData.CLIENT_ID = logger.maskInfrastructureIds(maskedData.CLIENT_ID);
    }
    
    // Mask other sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey'];
    sensitiveFields.forEach(field => {
      if (maskedData[field]) {
        maskedData[field] = '********';
      }
    });

    return maskedData;
  }

  /**
   * Log API response details
   * @param response - API response
   * @param method - HTTP method
   * @param endpoint - API endpoint
   */
  private async logApiResponse(response: APIResponse, method: string, endpoint: string): Promise<void> {
    const status = response.status();
    const url = response.url();
    
    logger.logAction(`API Response: ${method} ${endpoint}`, `${status} ${url}`);
    
    // Log response body if available
    if (response.status() === 200) {
      try {
        const responseBody = await response.json();
        logger.logAction(`API Response Body: ${method} ${endpoint}`, JSON.stringify(responseBody));
      } catch {
        // If response is not JSON, log as text
        const responseText = await response.text();
        logger.logAction(`API Response Text: ${method} ${endpoint}`, responseText);
      }
    } else {
      // Log error responses
      const errorText = await response.text();
      logger.logError(`API Error Response: ${method} ${endpoint}`, `${status} - ${errorText}`);
    }

    // Log response headers
    const headers = response.headers();
    logger.logAction(`API Response Headers: ${method} ${endpoint}`, JSON.stringify(headers));
  }

  /**
   * Get transaction history
   * @param options - Query options
   * @returns API response with transaction data
   */
  async getTransactions(options: { limit?: number, offset?: number } = {}): Promise<APIResponse> {
    const queryParams = new URLSearchParams();
    
    if (options.limit) {
      queryParams.append('limit', options.limit.toString());
    }
    
    if (options.offset) {
      queryParams.append('offset', options.offset.toString());
    }

    return this.get(`/transactions?${queryParams.toString()}`);
  }

  /**
   * Create a new transaction
   * @param transactionData - Transaction data
   * @returns API response
   */
  async createTransaction(transactionData: {
    recipient: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<APIResponse> {
    return this.post('/transactions', transactionData);
  }

  /**
   * Get account balance
   * @returns API response with balance data
   */
  async getBalance(): Promise<APIResponse> {
    return this.get('/balance');
  }

  /**
   * Validate API response matches expected schema
   * @param response - API response
   * @param expectedSchema - Expected schema structure
   * @returns Validation result
   */
  async validateResponse(response: APIResponse, expectedSchema: any): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let isValid = true;

    try {
      const responseBody = await response.json();
      
      // Check status code
      if (response.status() !== 200) {
        isValid = false;
        errors.push(`Expected status 200, got ${response.status()}`);
      }

      // Check required fields
      const requiredFields = ['status', 'data'];
      requiredFields.forEach(field => {
        if (!responseBody[field]) {
          isValid = false;
          errors.push(`Missing required field: ${field}`);
        }
      });

      // Validate against expected schema
      if (expectedSchema) {
        Object.keys(expectedSchema).forEach(key => {
          if (expectedSchema[key] && !responseBody[key]) {
            isValid = false;
            errors.push(`Missing expected field: ${key}`);
          }
        });
      }

    } catch (error) {
      isValid = false;
      errors.push(`Response validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { isValid, errors };
  }
}

import { test, expect } from '@playwright/test';
import { ApiClient } from '../../src/utils/ApiClient';
import { config } from '../../src/utils/ConfigManager';
import { logger } from '../../src/utils/Logger';

/**
 * Transaction API Test Suite
 * Tests API endpoints with proper security and validation
 */
test.describe('Transaction API Tests', () => {
  let apiClient: ApiClient;
  let context: any;

  test.beforeAll(async ({ playwright }) => {
    logger.logAction('Starting transaction API tests');
    
    // Set up API context
    context = await playwright.request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${config.getSecret('MFA_SECRET')}`
      }
    });
  });

  test.beforeEach(async () => {
    apiClient = new ApiClient(context);
  });

  test.afterAll(async () => {
    await context.dispose();
    logger.logSuccess('Transaction API tests completed');
  });

  test('should GET /transactions and return 200 OK', async () => {
    try {
      logger.logAction('Testing GET /transactions endpoint');

      const response = await apiClient.get('/transactions');
      
      // Verify status code
      expect(response.status()).toBe(200);
      
      // Verify response is JSON
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
      
      // Verify response body structure
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toHaveProperty('transactions');
      expect(Array.isArray(responseBody.data.transactions)).toBe(true);
      
      logger.logSuccess('GET /transactions test passed');
    } catch (error) {
      logger.logError('GET /transactions test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should verify response JSON schema matches Fintech requirements', async () => {
    try {
      logger.logAction('Testing response schema validation');

      const response = await apiClient.get('/transactions');
      const responseBody = await response.json();
      
      // Define expected schema
      const expectedSchema = {
        data: {
          transactions: Array,
          pagination: {
            page: 'number',
            limit: 'number',
            total: 'number'
          }
        },
        status: 'string',
        timestamp: 'string'
      };

      // Validate response against expected schema
      const validation = await apiClient.validateResponse(response, expectedSchema);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      logger.logSuccess('Response schema validation test passed');
    } catch (error) {
      logger.logError('Response schema validation test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should POST transaction with negative amount and return 400 Bad Request', async () => {
    try {
      logger.logAction('Testing POST transaction with negative amount');

      const negativeTransaction = {
        recipient: 'test@example.com',
        amount: -100, // Negative amount
        currency: 'USD',
        description: 'Test negative amount'
      };

      const response = await apiClient.post('/transactions', negativeTransaction);
      
      // Verify 400 status code
      expect(response.status()).toBe(400);
      
      // Verify error response
      const errorResponse = await response.json();
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toContain('amount');
      expect(errorResponse.error).toContain('negative');
      
      logger.logSuccess('Negative amount test passed');
    } catch (error) {
      logger.logError('Negative amount test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should create transaction with valid data and return 201 Created', async () => {
    try {
      logger.logAction('Testing POST transaction creation');

      const validTransaction = {
        recipient: 'valid-recipient@example.com',
        amount: 100.00,
        currency: 'USD',
        description: 'Test valid transaction'
      };

      const response = await apiClient.post('/transactions', validTransaction);
      
      // Verify 201 status code for created resource
      expect(response.status()).toBe(201);
      
      // Verify success response
      const successResponse = await response.json();
      expect(successResponse).toHaveProperty('data');
      expect(successResponse.data).toHaveProperty('transactionId');
      expect(successResponse.data).toHaveProperty('status');
      expect(successResponse.data.status).toBe('completed');
      
      logger.logSuccess('Transaction creation test passed');
    } catch (error) {
      logger.logError('Transaction creation test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  test('should handle authentication failure with 401 Unauthorized', async () => {
    try {
      logger.logAction('Testing authentication failure');

      // Create context without auth headers
      const unauthContext = await context.request.newContext();
      const unauthClient = new ApiClient(unauthContext);
      
      const response = await unauthClient.get('/transactions');
      
      // Verify 401 status code
      expect(response.status()).toBe(401);
      
      // Verify error response
      const errorResponse = await response.json();
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toContain('unauthorized');
      
      await unauthContext.dispose();
      
      logger.logSuccess('Authentication failure test passed');
    } catch (error) {
      logger.logError('Authentication failure test failed', error instanceof Error ? error : String(error));
      throw error;
    }
  });
});

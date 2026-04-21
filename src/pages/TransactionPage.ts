import { Page, Locator } from '@playwright/test';
import { config } from '../utils/ConfigManager';
import { logger } from '../utils/Logger';
import { currencyUtils } from '../utils/CurrencyUtils';

/**
 * Page Object Model for Fintech Transaction Page
 * Handles payment sending, balance checking, and transaction operations
 */
export class TransactionPage {
  private page: Page;

  // Transaction form selectors
  private readonly recipientInput: Locator;
  private readonly amountInput: Locator;
  private readonly sendButton: Locator;
  private readonly balanceDisplay: Locator;
  private readonly transactionSuccess: Locator;
  private readonly insufficientFundsError: Locator;
  private readonly currencySelector: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.recipientInput = page.locator('input[name="recipient"], input[placeholder*="recipient"], input[placeholder*="payee"]');
    this.amountInput = page.locator('input[name="amount"], input[placeholder*="amount"], input[type="number"]');
    this.sendButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Pay"), button:has-text("Transfer")');
    this.balanceDisplay = page.locator('.balance, .account-balance, [data-testid="balance"], .current-balance');
    this.transactionSuccess = page.locator('.success, .transaction-complete, .payment-success, [data-testid="success"]');
    this.insufficientFundsError = page.locator('.error, .insufficient-funds, .payment-error, [data-testid="insufficient-funds"]');
    this.currencySelector = page.locator('select[name="currency"], .currency-selector, [data-testid="currency"]');
  }

  /**
   * Navigate to transaction page
   */
  async navigateToTransactionPage(): Promise<void> {
    try {
      logger.logAction('Navigating to transaction page');
      
      await this.page.goto('/transactions', { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');
      
      // Wait for transaction form to be visible
      await this.recipientInput.waitFor({ state: 'visible', timeout: 10000 });
      
      logger.logSuccess('Successfully navigated to transaction page');
    } catch (error) {
      logger.logError('Failed to navigate to transaction page', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Send payment to a recipient with dynamic currency handling
   * @param recipient - The recipient of the payment
   * @param amount - The amount to send
   */
  async sendPayment(recipient: string, amount: number): Promise<void> {
    try {
      const transactionConfig = config.getTransactionConfig();
      const currency = transactionConfig.defaultCurrency;
      
      logger.logAction(`Sending payment: ${currency} ${amount} to ${recipient}`, amount.toString());
      logger.logAction(`Recipient: ${recipient}`, recipient);

      // Fill in recipient
      await this.recipientInput.fill(recipient);
      
      // Handle currency selection if available
      const currencySelectorVisible = await this.currencySelector.isVisible({ timeout: 2000 });
      if (currencySelectorVisible) {
        await this.currencySelector.selectOption({ label: currency });
        logger.logAction(`Selected currency: ${currency}`, currency);
      }

      // Fill in amount (formatted for display)
      const formattedAmount = currencyUtils.formatCurrency(amount, 'en-US', currency);
      await this.amountInput.fill(formattedAmount);
      
      // Click send button
      await this.sendButton.click();
      
      // Wait for processing
      await this.page.waitForTimeout(3000);
      
      logger.logSuccess(`Payment sent: ${currency} ${amount} to ${recipient}`);
    } catch (error) {
      logger.logError('Failed to send payment', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Get current balance from the page, stripping currency symbols
   * @returns Current balance as number
   */
  async getCurrentBalance(): Promise<number> {
    try {
      logger.logAction('Getting current balance from page');
      
      // Wait for balance to be visible
      await this.balanceDisplay.waitFor({ state: 'visible', timeout: 10000 });
      
      // Get balance text
      const balanceText = await this.balanceDisplay.textContent() || '';
      logger.logAction(`Raw balance text: "${balanceText}"`, balanceText);
      
      // Strip currency formatting and convert to number
      const cleanBalance = currencyUtils.stripCurrencyFormatting(balanceText);
      
      logger.logSuccess(`Current balance: ${cleanBalance}`, cleanBalance.toString());
      
      return cleanBalance;
    } catch (error) {
      logger.logError('Failed to get current balance', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Verify transaction was successful
   * @returns True if transaction succeeded
   */
  async verifyTransactionSuccess(): Promise<boolean> {
    try {
      logger.logAction('Verifying transaction success');
      
      // Wait for success message or error
      await this.page.waitForTimeout(3000);
      
      const successVisible = await this.transactionSuccess.isVisible({ timeout: 5000 });
      
      if (successVisible) {
        logger.logSuccess('Transaction successful - success message visible');
        return true;
      }
      
      // Check for insufficient funds error
      const errorVisible = await this.insufficientFundsError.isVisible({ timeout: 2000 });
      if (errorVisible) {
        const errorText = await this.insufficientFundsError.textContent() || '';
        logger.logError('Insufficient funds error detected', errorText);
        return false;
      }
      
      logger.logWarning('Transaction status unclear - no success or error message found');
      return false;
    } catch (error) {
      logger.logError('Failed to verify transaction success', error instanceof Error ? error : String(error));
      return false;
    }
  }

  /**
   * Calculate expected balance after transaction
   * @param currentBalance - Current account balance
   * @param transactionAmount - Amount being sent
   * @returns Expected new balance
   */
  async calculateExpectedBalance(currentBalance: number, transactionAmount: number): Promise<number> {
    try {
      // Convert to smallest units to avoid floating point errors
      const currentBalanceCents = currencyUtils.toSmallestUnit(currentBalance);
      const transactionAmountCents = currencyUtils.toSmallestUnit(transactionAmount);
      
      // Calculate new balance in cents
      const newBalanceCents = currencyUtils.calculateExpectedBalance(
        currentBalanceCents, 
        -transactionAmountCents // Negative because we're sending money
      );
      
      // Convert back to standard format
      const newBalance = currencyUtils.fromSmallestUnit(newBalanceCents);
      
      logger.logAction(`Expected balance calculation: ${currentBalance} - ${transactionAmount} = ${newBalance}`, 
        `${currentBalance},${transactionAmount}`);
      
      return newBalance;
    } catch (error) {
      logger.logError('Failed to calculate expected balance', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Wait for balance to update after transaction
   * @param timeout - Maximum time to wait (default: 10 seconds)
   */
  async waitForBalanceUpdate(timeout: number = 10000): Promise<void> {
    try {
      logger.logAction('Waiting for balance to update');
      
      // Wait for balance to refresh (this might involve AJAX calls)
      await this.page.waitForTimeout(2000);
      
      // Wait for balance to be stable (no changes for 1 second)
      let previousBalance = await this.getCurrentBalance();
      let stableCount = 0;
      
      while (stableCount < 3) { // Check 3 times to ensure stability
        await this.page.waitForTimeout(1000);
        const currentBalance = await this.getCurrentBalance();
        
        if (Math.abs(currentBalance - previousBalance) < 0.01) {
          stableCount++;
        } else {
          stableCount = 0;
          previousBalance = currentBalance;
        }
      }
      
      logger.logSuccess('Balance update completed and stabilized');
    } catch (error) {
      logger.logError('Failed to wait for balance update', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Check if insufficient funds error is displayed
   * @returns True if insufficient funds error is visible
   */
  async isInsufficientFundsErrorVisible(): Promise<boolean> {
    try {
      return await this.insufficientFundsError.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Get any error message from the transaction form
   * @returns Error message text or null
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      if (await this.insufficientFundsError.isVisible({ timeout: 3000 })) {
        return await this.insufficientFundsError.textContent() || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Complete transaction flow with balance verification
   * @param recipient - Payment recipient
   * @param amount - Payment amount
   */
  async completeTransaction(recipient: string, amount: number): Promise<{
    success: boolean;
    previousBalance: number;
    newBalance: number;
    expectedBalance: number;
    errorMessage?: string;
  }> {
    try {
      logger.logAction(`Starting complete transaction flow: ${recipient}, ${amount}`);

      // Get initial balance
      const previousBalance = await this.getCurrentBalance();
      
      // Calculate expected balance
      const expectedBalance = await this.calculateExpectedBalance(previousBalance, amount);
      
      // Send payment
      await this.sendPayment(recipient, amount);
      
      // Wait for transaction to complete
      const success = await this.verifyTransactionSuccess();
      
      if (success) {
        // Wait for balance to update
        await this.waitForBalanceUpdate();
        
        // Get new balance
        const newBalance = await this.getCurrentBalance();
        
        logger.logSuccess(`Transaction completed successfully. Balance: ${previousBalance} → ${newBalance}`);
        
        return {
          success: true,
          previousBalance,
          newBalance,
          expectedBalance,
          errorMessage: undefined
        };
      } else {
        // Get error message
        const errorMessage = await this.getErrorMessage();
        
        logger.logError(`Transaction failed: ${errorMessage}`);
        
        return {
          success: false,
          previousBalance,
          newBalance: previousBalance, // Balance unchanged
          expectedBalance,
          errorMessage: errorMessage || 'Unknown error'
        };
      }
    } catch (error) {
      logger.logError('Complete transaction flow failed', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Verify transaction page is loaded and ready
   */
  async isTransactionPageReady(): Promise<boolean> {
    try {
      return await this.recipientInput.isVisible({ timeout: 5000 }) &&
             await this.amountInput.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Get date of the last transaction from the page
   * @returns Transaction date as string or null
   */
  async getTransactionDate(): Promise<string | null> {
    try {
      logger.logAction('Getting transaction date from page');
      
      // Common selectors for transaction date
      const dateSelectors = [
        '.transaction-date',
        '[data-testid="transaction-date"]',
        '.date',
        '.timestamp',
        '.transaction-timestamp',
        'time[datetime]',
        '.created-at'
      ];
      
      let transactionDate = null;
      
      for (const selector of dateSelectors) {
        try {
          const dateElement = this.page.locator(selector);
          if (await dateElement.isVisible({ timeout: 2000 })) {
            const dateText = await dateElement.textContent() || '';
            if (dateText.trim()) {
              transactionDate = dateText.trim();
              logger.logAction(`Found transaction date: ${transactionDate}`, transactionDate);
              break;
            }
          }
        } catch {
          // Continue to next selector
        }
      }
      
      if (transactionDate) {
        logger.logSuccess(`Transaction date retrieved: ${transactionDate}`);
      } else {
        logger.logWarning('Transaction date not found on page');
      }
      
      return transactionDate;
    } catch (error) {
      logger.logError('Failed to get transaction date', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Clear transaction form
   */
  async clearForm(): Promise<void> {
    try {
      logger.logAction('Clearing transaction form');
      
      await this.recipientInput.clear();
      await this.amountInput.clear();
      
      logger.logSuccess('Transaction form cleared');
    } catch (error) {
      logger.logError('Failed to clear transaction form', error instanceof Error ? error : String(error));
      throw error;
    }
  }
}

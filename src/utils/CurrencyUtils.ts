import { logger } from './Logger';

/**
 * Currency Utility for high-precision financial calculations
 * Handles currency conversion, formatting, and balance calculations in integer space
 */
export class CurrencyUtils {
  private static instance: CurrencyUtils;

  private constructor() {}

  /**
   * Get singleton instance of CurrencyUtils
   */
  public static getInstance(): CurrencyUtils {
    if (!CurrencyUtils.instance) {
      CurrencyUtils.instance = new CurrencyUtils();
    }
    return CurrencyUtils.instance;
  }

  /**
   * Convert currency amount to smallest unit (cents) to avoid floating-point precision issues
   * @param amount - The amount in standard currency format (e.g., 1.25)
   * @param factor - Conversion factor (default: 100 for cents)
   * @returns Amount in smallest unit as integer (e.g., 125)
   */
  public toSmallestUnit(amount: number, factor: number = 100): number {
    try {
      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error(`Invalid amount: ${amount}`);
      }

      if (factor <= 0) {
        throw new Error(`Invalid factor: ${factor}. Must be positive.`);
      }

      const smallestUnit = Math.round(amount * factor);
      
      logger.logAction(`Converted ${amount} to smallest unit: ${smallestUnit}`, amount.toString());
      
      return smallestUnit;
    } catch (error) {
      logger.logError('Failed to convert to smallest unit', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Convert smallest unit back to standard currency format
   * @param smallestUnit - Amount in smallest unit (e.g., 125)
   * @param factor - Conversion factor (default: 100 for cents)
   * @returns Amount in standard currency format (e.g., 1.25)
   */
  public fromSmallestUnit(smallestUnit: number, factor: number = 100): number {
    try {
      if (typeof smallestUnit !== 'number' || isNaN(smallestUnit)) {
        throw new Error(`Invalid smallest unit: ${smallestUnit}`);
      }

      if (factor <= 0) {
        throw new Error(`Invalid factor: ${factor}. Must be positive.`);
      }

      const amount = smallestUnit / factor;
      
      logger.logAction(`Converted ${smallestUnit} from smallest unit: ${amount}`, smallestUnit.toString());
      
      return parseFloat(amount.toFixed(2)); // Ensure 2 decimal places
    } catch (error) {
      logger.logError('Failed to convert from smallest unit', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Format currency amount with locale and currency symbol
   * @param amount - The amount to format
   * @param locale - Locale string (e.g., 'en-US', 'de-DE')
   * @param currency - Currency code (e.g., 'USD', 'EUR', 'GBP')
   * @returns Formatted currency string
   */
  public formatCurrency(amount: number, locale: string = 'en-US', currency: string = 'USD'): string {
    try {
      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error(`Invalid amount for formatting: ${amount}`);
      }

      // Use Intl.NumberFormat for proper currency formatting
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const formatted = formatter.format(amount);
      
      logger.logAction(`Formatted ${amount} ${currency} as: ${formatted}`, amount.toString());
      
      return formatted;
    } catch (error) {
      logger.logError('Failed to format currency', error instanceof Error ? error : String(error));
      
      // Fallback to simple formatting
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Calculate expected balance using integer arithmetic to avoid rounding errors
   * @param initial - Initial balance in smallest unit
   * @param change - Amount to add/subtract in smallest unit
   * @returns New balance in smallest unit
   */
  public calculateExpectedBalance(initial: number, change: number): number {
    try {
      if (typeof initial !== 'number' || typeof change !== 'number') {
        throw new Error(`Invalid balance parameters: initial=${initial}, change=${change}`);
      }

      const newBalance = initial + change;
      
      logger.logAction(`Calculated balance: ${initial} + ${change} = ${newBalance}`, `${initial},${change}`);
      
      return newBalance;
    } catch (error) {
      logger.logError('Failed to calculate expected balance', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Strip currency symbols and formatting from a string to get clean number
   * @param currencyString - String with currency formatting (e.g., '$1,234.56', '€1.234,56')
   * @returns Clean number as float
   */
  public stripCurrencyFormatting(currencyString: string): number {
    try {
      if (typeof currencyString !== 'string') {
        throw new Error(`Invalid currency string: ${currencyString}`);
      }

      // Remove currency symbols and formatting
      const cleanString = currencyString
        .replace(/[€$£¥₹₽₩¢]/g, '') // Remove common currency symbols
        .replace(/[,\s]/g, '') // Remove commas and spaces
        .replace(/[()]/g, ''); // Remove parentheses (used for negative amounts)

      const number = parseFloat(cleanString);
      
      if (isNaN(number)) {
        throw new Error(`Could not parse number from: ${currencyString}`);
      }

      logger.logAction(`Stripped currency formatting: "${currencyString}" -> ${number}`, currencyString);
      
      return number;
    } catch (error) {
      logger.logError('Failed to strip currency formatting', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Validate if a value is a valid monetary amount
   * @param amount - Amount to validate
   * @returns True if valid monetary amount
   */
  public isValidAmount(amount: number): boolean {
    try {
      return typeof amount === 'number' && 
             !isNaN(amount) && 
             isFinite(amount) && 
             amount >= 0;
    } catch (error) {
      logger.logError('Amount validation failed', error instanceof Error ? error : String(error));
      return false;
    }
  }

  /**
   * Round amount to 2 decimal places (standard for most currencies)
   * @param amount - Amount to round
   * @returns Rounded amount
   */
  public roundToCents(amount: number): number {
    try {
      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error(`Invalid amount for rounding: ${amount}`);
      }

      const rounded = Math.round(amount * 100) / 100;
      
      logger.logAction(`Rounded ${amount} to ${rounded}`, amount.toString());
      
      return rounded;
    } catch (error) {
      logger.logError('Failed to round amount', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Compare two monetary amounts safely
   * @param amount1 - First amount
   * @param amount2 - Second amount
   * @returns Comparison result (-1, 0, 1)
   */
  public compareAmounts(amount1: number, amount2: number): number {
    try {
      if (!this.isValidAmount(amount1) || !this.isValidAmount(amount2)) {
        throw new Error(`Invalid amounts for comparison: ${amount1}, ${amount2}`);
      }

      const comparison = amount1 - amount2;
      
      logger.logAction(`Compared amounts: ${amount1} vs ${amount2} = ${comparison}`, `${amount1},${amount2}`);
      
      return comparison > 0 ? 1 : comparison < 0 ? -1 : 0;
    } catch (error) {
      logger.logError('Failed to compare amounts', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Get currency symbol for a currency code
   * @param currencyCode - Currency code (e.g., 'USD', 'EUR')
   * @returns Currency symbol
   */
  public getCurrencySymbol(currencyCode: string): string {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'INR': '₹',
      'RUB': '₽',
      'KRW': '₩',
      'CNY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF'
    };

    return symbols[currencyCode] || currencyCode;
  }

  /**
   * Get expected date format based on currency locale
   * @param currencyCode - Currency code (e.g., 'USD', 'EUR')
   * @returns Date format string (e.g., 'MM/DD/YYYY', 'DD.MM.YYYY')
   */
  public getExpectedDateFormat(currencyCode: string): string {
    try {
      const localeFormats: { [key: string]: string } = {
        'USD': 'MM/DD/YYYY', // US format
        'EUR': 'DD.MM.YYYY', // European format
        'GBP': 'DD/MM/YYYY', // UK format
        'JPY': 'YYYY/MM/DD', // Japanese format
        'INR': 'DD/MM/YYYY', // Indian format
        'RUB': 'DD.MM.YYYY', // Russian format
        'KRW': 'YYYY. MM. DD.', // Korean format
        'CNY': 'YYYY年MM月DD日', // Chinese format
        'CAD': 'DD/MM/YYYY', // Canadian format
        'AUD': 'DD/MM/YYYY', // Australian format
        'CHF': 'DD.MM.YYYY'  // Swiss format
      };

      const format = localeFormats[currencyCode] || 'MM/DD/YYYY';
      
      logger.logAction(`Retrieved date format for ${currencyCode}: ${format}`, currencyCode);
      
      return format;
    } catch (error) {
      logger.logError('Failed to get expected date format', error instanceof Error ? error : String(error));
      return 'MM/DD/YYYY'; // Fallback to US format
    }
  }

  /**
   * Get decimal separator based on currency locale
   * @param currencyCode - Currency code
   * @returns Decimal separator ('.' or ',')
   */
  public getDecimalSeparator(currencyCode: string): string {
    const commaCurrencies = ['EUR', 'GBP', 'INR', 'RUB', 'CHF'];
    return commaCurrencies.includes(currencyCode) ? ',' : '.';
  }

  /**
   * Get thousands separator based on currency locale
   * @param currencyCode - Currency code
   * @returns Thousands separator (',' or '.')
   */
  public getThousandsSeparator(currencyCode: string): string {
    const commaCurrencies = ['EUR', 'GBP', 'INR', 'RUB', 'CHF'];
    return commaCurrencies.includes(currencyCode) ? '.' : ',';
  }
}

// Export singleton instance for easy access
export const currencyUtils = CurrencyUtils.getInstance();

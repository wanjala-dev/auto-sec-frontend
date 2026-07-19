/**
 * Single money formatter for the whole app.
 *
 * Replaces the scattered `formatCurrency` helpers that each hardcoded
 * `USD`. Uses `Intl.NumberFormat` so ISO 4217 precision
 * (0-decimal for JPY/KRW/VND, 2-decimal for USD/EUR, 3-decimal for
 * KWD) is correct for every locale without us maintaining a table.
 *
 * Contract:
 * - `amount` is the display amount in the currency's major unit
 *   (e.g. 12.50 for $12.50 USD, 1000 for ¥1000 JPY). Strings are
 *   parsed with Number(). Non-finite inputs render as the zero
 *   amount in the chosen currency — never `NaN` or the string
 *   `"$NaN"`.
 * - `currency` is an ISO 4217 three-letter code. Lowercase is
 *   accepted and normalized. If unknown, we fall back to USD
 *   formatting so screens still render; upstream should have
 *   validated the code, so this is belt-and-braces only.
 * - `locale` defaults to `undefined`, which lets the browser pick
 *   the user's locale. Pass an explicit locale when formatting for
 *   exports/receipts that need to be deterministic.
 */

import { isSupportedCurrency } from './types';
import type { CurrencyCode, Money } from './types';

const DEFAULT_CURRENCY: CurrencyCode = 'USD';

interface FormatMoneyOptions {
  /** Override the browser locale — mainly for exports + tests. */
  locale?: string;
  /**
   * Render the sign in front of negatives (`-$5.00`) vs in parens
   * (`($5.00)`). Accounting layouts tend to want parens; everywhere
   * else defaults to the normal sign. Matches `Intl.NumberFormat`.
   */
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
  /**
   * Drop the fractional part even for currencies that normally carry
   * one. Useful for summary tiles that only show whole dollars.
   * Per-call only — does not affect receipts / forms.
   */
  compact?: boolean;
}

const normalizeCurrency = (input: unknown): CurrencyCode => {
  if (typeof input !== 'string') return DEFAULT_CURRENCY;
  const trimmed = input.trim().toUpperCase();
  // Only honor codes in the platform allowlist so unknown values
  // render with the app's default currency symbol instead of a raw
  // three-letter code prefix (which is what Intl.NumberFormat would
  // otherwise produce).
  return isSupportedCurrency(trimmed)
    ? (trimmed as CurrencyCode)
    : DEFAULT_CURRENCY;
};

const normalizeAmount = (input: unknown): number => {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : 0;
  }
  if (typeof input === 'string') {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const buildFormatter = (
  currency: string,
  locale: string | undefined,
  signDisplay: FormatMoneyOptions['signDisplay'] | undefined,
  compact: boolean
): Intl.NumberFormat => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      signDisplay,
      ...(compact ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {})
    });
  } catch {
    // Unknown currency code — fall back to USD to keep screens
    // rendering. Upstream validation should prevent this path.
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      signDisplay,
      ...(compact ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {})
    });
  }
};

/**
 * Format a currency amount for display.
 *
 * @example
 *   formatMoney({ amount: 12.5, currency: 'USD' })  // "$12.50"
 *   formatMoney({ amount: 1000, currency: 'JPY' })  // "¥1,000"
 *   formatMoney({ amount: '9.99', currency: 'eur' }) // "€9.99"
 *   formatMoney({ amount: NaN, currency: 'USD' })    // "$0.00"
 */
export const formatMoney = (
  money: Money,
  options: FormatMoneyOptions = {}
): string => {
  const currency = normalizeCurrency(money?.currency);
  const amount = normalizeAmount(money?.amount);
  const formatter = buildFormatter(
    currency,
    options.locale,
    options.signDisplay,
    Boolean(options.compact)
  );
  return formatter.format(amount);
};

/**
 * Shorthand for callers that already have discrete amount + currency
 * values and don't want to build a Money literal.
 */
export const formatAmount = (
  amount: Money['amount'],
  currency: Money['currency'],
  options?: FormatMoneyOptions
): string => formatMoney({ amount, currency }, options);

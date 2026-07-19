/**
 * Shared money / currency types for the frontend.
 *
 * Mirrors the backend `components/money/` domain so the contract is
 * the same across the wire. All amounts are numeric display units or
 * decimal-friendly strings — never pre-formatted strings with currency
 * symbols and never floats that have been through a locale.
 */

/**
 * Single source of truth for the frontend-supported ISO 4217 codes.
 * Kept aligned with the backend `SUPPORTED_CURRENCIES` frozenset in
 * `components/money/domain/currencies.py`. Adding a new code is a
 * deliberate product decision — update both sides together.
 */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'NZD',
  'CHF',
  'JPY',
  'SGD',
  'HKD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'MXN',
  'BRL',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'UYU',
  'KES',
  'NGN',
  'ZAR',
  'GHS',
  'EGP',
  'MAD',
  'INR',
  'IDR',
  'MYR',
  'PHP',
  'THB',
  'VND',
  'KRW',
  'AED',
  'SAR',
  'ILS',
  'TRY'
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

const SUPPORTED_CURRENCY_SET: ReadonlySet<string> = new Set(
  SUPPORTED_CURRENCIES
);

export const isSupportedCurrency = (code: unknown): code is CurrencyCode => {
  if (typeof code !== 'string') return false;
  return SUPPORTED_CURRENCY_SET.has(code.trim().toUpperCase());
};

/**
 * Amount + currency pair. Amount is in the currency's display unit
 * (e.g. 10.50 for $10.50 USD, 1000 for ¥1000 JPY). Use
 * {@link formatMoney} to render.
 */
export interface Money {
  amount: number | string;
  currency: CurrencyCode | string;
}

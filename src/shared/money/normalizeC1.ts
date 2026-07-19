/**
 * C1 money-object normalization (the /api/v1 anti-corruption layer).
 *
 * The backend v1 contract returns every monetary amount as a C1 object:
 *   { amount_minor: <int>, currency: <ISO>, amount_display: <preformatted> }
 * e.g. 25.00 USD -> { amount_minor: 2500, currency: 'USD', amount_display: 'USD 25.00' }.
 *
 * The frontend's money model is "major-units number + currency" (see
 * shared/money/types.ts), and ~150 call sites read money as a scalar
 * (`x.amount`) and format it via formatMoney/formatAmount. Rather than
 * teach every site about C1, we translate at the HTTP boundary: a response
 * interceptor walks the payload and replaces each C1 object with its
 * major-units number, backfilling the parent's `currency` when absent.
 *
 * This is a boundary adapter (anti-corruption layer): it maps the v1 wire
 * format onto the frontend's existing domain model, so the app behaves
 * exactly as on v0 (money is a number). It deliberately discards
 * `amount_display`; currency-correct display is reproduced by the
 * frontend formatter. C1's richer features (server display strings,
 * integer minor-unit math) can be adopted incrementally later.
 *
 * Conversion uses the per-currency ISO 4217 minor-unit exponent — never a
 * blind /100 — mirroring components/money/domain/currencies.py. Most
 * currencies are 2 decimals; the exceptions are the 0-decimal ones.
 */

// 0-decimal currencies in the supported set. Everything else is 2.
// Mirror of MINOR_UNIT_EXPONENTS in components/money/domain/currencies.py.
const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  'JPY',
  'KRW',
  'CLP',
  'VND'
]);
const DEFAULT_MINOR_UNIT_EXPONENT = 2;

export const minorUnitExponent = (currency: unknown): number => {
  if (typeof currency !== 'string') return DEFAULT_MINOR_UNIT_EXPONENT;
  return ZERO_DECIMAL_CURRENCIES.has(currency.trim().toUpperCase())
    ? 0
    : DEFAULT_MINOR_UNIT_EXPONENT;
};

interface C1Money {
  amount_minor: number;
  currency: string;
  amount_display: string;
}

/**
 * A value is a C1 money object iff it has exactly the three contract keys
 * with the right primitive types. The triple is unambiguous, so this never
 * false-positives on ordinary domain objects.
 */
export const isC1Money = (value: unknown): value is C1Money => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.amount_minor === 'number' &&
    typeof v.currency === 'string' &&
    typeof v.amount_display === 'string'
  );
};

/** Convert a C1 object to its major-units number using the currency's exponent. */
export const c1ToMajor = (money: C1Money): number => {
  const factor = 10 ** minorUnitExponent(money.currency);
  return money.amount_minor / factor;
};

/**
 * Recursively walk a parsed JSON payload in place, replacing every C1 money
 * object with its major-units number. When a parent object holds a C1 value
 * and has no own `currency` key, backfill it from the (first) C1 child so
 * call sites doing `formatAmount(x.amount, x.currency)` still get the right
 * currency even when v1 folded currency into the money object.
 *
 * `null` money (C8 present-null) is left as `null` — same as v0.
 */
export const normalizeC1Money = <T>(node: T): T => {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const item = node[i];
      if (isC1Money(item)) {
        (node as unknown[])[i] = c1ToMajor(item);
      } else if (item && typeof item === 'object') {
        normalizeC1Money(item);
      }
    }
    return node;
  }

  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    let inferredCurrency: string | undefined;
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (isC1Money(value)) {
        if (!inferredCurrency) inferredCurrency = value.currency;
        obj[key] = c1ToMajor(value);
      } else if (value && typeof value === 'object') {
        normalizeC1Money(value);
      }
    }
    if (
      inferredCurrency &&
      (obj.currency === undefined || obj.currency === null)
    ) {
      obj.currency = inferredCurrency;
    }
    return node;
  }

  return node;
};

import { useMemo } from 'react';
import { useGeo } from './useGeo';

// Countries billed in USD: North America, EU, AU, NZ, JP, KR
const USD_COUNTRIES = new Set([
  // North America
  'US', 'CA', 'MX',
  // European Union (27 members)
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  // Other English-speaking developed markets
  'GB', 'AU', 'NZ',
  // Asia Pacific developed
  'JP', 'KR',
]);

export interface CurrencyInfo {
  code: 'CNY' | 'USD';
  symbol: '¥' | '$';
  loading: boolean;
  /** Convert a price-cents value to display cents in the active currency */
  toDisplayCents: (cnyCents: number) => number;
  /** Format display cents to a user-facing price string (no symbol) */
  formatAmount: (displayCents: number) => string;
}

export function useGeoCurrency(): CurrencyInfo {
  const { countryCode, loading } = useGeo();

  return useMemo<CurrencyInfo>(() => {
    const isUSD = !loading && countryCode !== null && USD_COUNTRIES.has(countryCode);
    const code = isUSD ? 'USD' : 'CNY';
    const symbol = isUSD ? '$' : '¥';

    // 统一按 1 美金计价：价格数字 1:1（¥10 → $10），不做汇率折算。
    // 未来若接入其他货币（欧元/日元等），再按各自对 1 美金的汇率折算。
    const toDisplayCents = (cnyCents: number) => cnyCents;

    const formatAmount = (cents: number) => {
      if (isUSD) {
        return (cents / 100).toFixed(2);
      }
      // CNY: show integers (¥29, ¥198), keep .xx only if fractional
      const val = cents / 100;
      return Number.isInteger(val) ? val.toFixed(0) : val.toFixed(2);
    };

    return { code, symbol, loading, toDisplayCents, formatAmount };
  }, [countryCode, loading]);
}

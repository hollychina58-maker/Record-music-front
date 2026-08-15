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

// 定价基准：1 美金 = 100 分（服务端 products.price_cents 为美金分）。
// CNY 等其它货币按 1 USD 的汇率折算展示。
const USD_TO_CNY_RATE = 7.2; // 1 USD ≈ 7.2 CNY

export interface CurrencyInfo {
  code: 'CNY' | 'USD';
  symbol: '¥' | '$';
  loading: boolean;
  /** Convert a price-cents value (美金分) to display cents in the active currency */
  toDisplayCents: (usdCents: number) => number;
  /** Format display cents to a user-facing price string (no symbol) */
  formatAmount: (displayCents: number) => string;
}

export function useGeoCurrency(): CurrencyInfo {
  const { countryCode, loading } = useGeo();

  return useMemo<CurrencyInfo>(() => {
    const isUSD = !loading && countryCode !== null && USD_COUNTRIES.has(countryCode);
    const code = isUSD ? 'USD' : 'CNY';
    const symbol = isUSD ? '$' : '¥';

    // 定价基准 1 美金：USD 国家 1:1 显示美金分，CNY 按汇率折算为人民币分。
    const toDisplayCents = (usdCents: number) =>
      isUSD ? usdCents : Math.round(usdCents * USD_TO_CNY_RATE);

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

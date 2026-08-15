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

// USD prices: 1 CNY ≈ 0.14 USD, rounded to nearest .99 (floor at $0.99).
// 严格单调递增：更大的 CNY 套餐绝不显示更便宜的 USD 价格。
// 之前 100→199($1.99)/500→699($6.99) 是混入的溢价定价，与 0.14 汇率不一致，
// 导致 ¥10($1.49) < ¥1($1.99)、¥5($6.99) == ¥49($6.99) 的矛盾，已统一为汇率。
const CNY_TO_USD_CENTS: Record<number, number> = {
  100:   99,    // ¥1   → $0.99
  299:   99,    // ¥2.99 → $0.99
  500:   99,    // ¥5   → $0.99
  1000:  149,   // ¥10  → $1.49
  2000:  299,   // ¥20  → $2.99
  2900:  399,   // ¥29  → $3.99
  4900:  699,   // ¥49  → $6.99
  5800:  799,   // ¥58  → $7.99
  9800:  1399,  // ¥98  → $13.99
  19800: 2799,  // ¥198 → $27.99
  29800: 4199,  // ¥298 → $41.99（0.14 汇率的正确值，原 3999 偏低致 ¥288 默认套餐倒挂）
};

function cnyCentsToUsdCents(cnyCents: number): number {
  if (CNY_TO_USD_CENTS[cnyCents] !== undefined) return CNY_TO_USD_CENTS[cnyCents];
  // Fallback: 1 CNY = 0.14 USD，向最近的 .99 取整（最低 $0.99）。
  // 与上表一致，保证任何未列出的价格（如默认年度 ¥288）不破坏单调递增。
  const raw = Math.max(1, Math.round(cnyCents * 0.14));
  let cents = Math.max(99, Math.round((raw + 1) / 100) * 100 - 1);
  // 单调性兜底：不小于 table 中所有 <= cnyCents 的档位（避免 ¥10.01 比 ¥10 便宜的边缘倒挂）
  for (const key of Object.keys(CNY_TO_USD_CENTS)) {
    const k = Number(key);
    if (k <= cnyCents && CNY_TO_USD_CENTS[k] > cents) cents = CNY_TO_USD_CENTS[k];
  }
  return cents;
}

export interface CurrencyInfo {
  code: 'CNY' | 'USD';
  symbol: '¥' | '$';
  loading: boolean;
  /** Convert a CNY cents value to display cents in the active currency */
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

    const toDisplayCents = (cnyCents: number) =>
      isUSD ? cnyCentsToUsdCents(cnyCents) : cnyCents;

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

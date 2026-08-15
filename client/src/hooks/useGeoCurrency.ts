import { useMemo } from 'react';
import { useGeo } from './useGeo';

// ── 多币种定价：以 1 美金为基准（products.price_cents 为美金分） ──
// rate = 1 USD 兑换该货币的数量。CNY 按用户指定 6；其余参考 2026-08 人民币汇率中间价折算。
const CURRENCIES: Record<string, { symbol: string; rate: number; decimals: number }> = {
  USD: { symbol: '$', rate: 1, decimals: 2 },
  CNY: { symbol: '¥', rate: 6, decimals: 2 },
  EUR: { symbol: '€', rate: 0.87, decimals: 2 },
  GBP: { symbol: '£', rate: 0.74, decimals: 2 },
  JPY: { symbol: 'JP¥', rate: 160, decimals: 0 },
  KRW: { symbol: '₩', rate: 1425, decimals: 0 },
  CAD: { symbol: 'C$', rate: 1.4, decimals: 2 },
  AUD: { symbol: 'A$', rate: 1.42, decimals: 2 },
  NZD: { symbol: 'NZ$', rate: 1.72, decimals: 2 },
  MXN: { symbol: 'MX$', rate: 17.06, decimals: 2 },
};

// 国家代码 → 货币代码（欧盟 27 国 → EUR，中文区 → CNY）
const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', MX: 'MXN',
  GB: 'GBP', AU: 'AUD', NZ: 'NZD', JP: 'JPY', KR: 'KRW',
  CN: 'CNY', HK: 'CNY', MO: 'CNY', TW: 'CNY', SG: 'CNY',
  // 欧盟 27 国
  AT: 'EUR', BE: 'EUR', BG: 'EUR', CY: 'EUR', CZ: 'EUR', DE: 'EUR', DK: 'EUR',
  EE: 'EUR', ES: 'EUR', FI: 'EUR', FR: 'EUR', GR: 'EUR', HR: 'EUR', HU: 'EUR',
  IE: 'EUR', IT: 'EUR', LT: 'EUR', LU: 'EUR', LV: 'EUR', MT: 'EUR', NL: 'EUR',
  PL: 'EUR', PT: 'EUR', RO: 'EUR', SE: 'EUR', SI: 'EUR', SK: 'EUR',
};

export interface CurrencyInfo {
  code: string;
  symbol: string;
  loading: boolean;
  /** 把美金分转换成当前货币的展示分 */
  toDisplayCents: (usdCents: number) => number;
  /** 把展示分格式化成用户可读价格（不含符号） */
  formatAmount: (displayCents: number) => string;
}

export function useGeoCurrency(): CurrencyInfo {
  const { countryCode, loading } = useGeo();

  return useMemo<CurrencyInfo>(() => {
    // 未识别国家默认 CNY（中文用户为主）
    const code = (!loading && countryCode && COUNTRY_CURRENCY[countryCode]) || 'CNY';
    const cur = CURRENCIES[code] || CURRENCIES.CNY;
    const { symbol, rate, decimals } = cur;

    const toDisplayCents = (usdCents: number) =>
      code === 'USD' ? usdCents : Math.round(usdCents * rate);

    const formatAmount = (cents: number) => {
      if (decimals === 0) {
        // JPY/KRW 等无小数货币，显示整数
        return String(Math.round(cents / 100));
      }
      const val = cents / 100;
      return Number.isInteger(val) ? val.toFixed(0) : val.toFixed(decimals);
    };

    return { code, symbol, loading, toDisplayCents, formatAmount };
  }, [countryCode, loading]);
}

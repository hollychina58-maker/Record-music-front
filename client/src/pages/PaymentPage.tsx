import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../i18n/LanguageContext';
import { useGeoCurrency } from '../hooks/useGeoCurrency';
import { apiService } from '../services/api';
import './PaymentPage.css';

interface Product {
  id: number;
  name: string;
  type: string;
  priceCents: number;
  musicLimit: number | null;
  description: string;
}

interface SubscriptionInfo {
  planName: string;
  planType: string;
  expiresAt: string;
  musicRemaining: number | null;
}

const PLAN_META: Record<string, {
  icon: string;
  color: string;
  nameKey: string;
  taglineKey: string;
  periodKey: string;
  featureKeys: string[];
  recommended?: boolean;
}> = {
  per_use: {
    icon: '✦',
    color: '#4f4f4f',
    nameKey: 'pp.plan.name.per_use',
    taglineKey: 'pp.plan.tagline.per_use',
    periodKey: 'pp.plan.period.per_use',
    featureKeys: [
      'pp.plan.feature.per_use.1',
      'pp.plan.feature.per_use.2',
      'pp.plan.feature.per_use.3',
      'pp.plan.feature.per_use.4',
    ],
  },
  monthly: {
    icon: '◈',
    color: '#3a4f8b',
    nameKey: 'pp.plan.name.monthly',
    taglineKey: 'pp.plan.tagline.monthly',
    periodKey: 'pp.plan.period.monthly',
    featureKeys: [
      'pp.plan.feature.monthly.1',
      'pp.plan.feature.monthly.2',
      'pp.plan.feature.monthly.3',
      'pp.plan.feature.monthly.4',
    ],
  },
  yearly: {
    icon: '❋',
    color: '#8b4513',
    nameKey: 'pp.plan.name.yearly',
    taglineKey: 'pp.plan.tagline.yearly',
    periodKey: 'pp.plan.period.yearly',
    featureKeys: [
      'pp.plan.feature.yearly.1',
      'pp.plan.feature.yearly.2',
      'pp.plan.feature.yearly.3',
      'pp.plan.feature.yearly.4',
    ],
    recommended: true,
  },
};

function DaysLeft({ expiresAt }: { expiresAt: string }) {
  const { t } = useLanguage();
  const days = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  return <>{days} {t('pp.sub.daysLeft')}</>;
}

export function PaymentPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const currency = useGeoCurrency();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login', { replace: true }); return; }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      const [productsData, subData] = await Promise.all([
        apiService.clientGet('/payments/products'),
        apiService.clientGet('/payments/subscription'),
      ]);
      const prods: Product[] = productsData.data;
      setProducts(prods);
      setSubscription(subData.data);
      if (!subData.data) {
        const yearly = prods.find((p) => p.type === 'yearly');
        if (yearly) setSelectedId(yearly.id);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="pp-page">
        <div className="pp-loading">
          <span className="pp-loading-char">{t('pp.loading.char')}</span>
          <span className="pp-loading-text">{t('pp.loading.text')}</span>
        </div>
      </div>
    );
  }

  const canPurchase = (p: Product) => {
    if (!subscription) return true;
    if (p.type === 'per_use') return subscription.musicRemaining !== null;
    if (subscription.planType === 'monthly' && p.type === 'yearly') return true;
    return false;
  };

  const isUpgrade = (p: Product) =>
    !!subscription && subscription.planType === 'monthly' && p.type === 'yearly';

  const displayPrice = (p: Product) => {
    if (isUpgrade(p)) {
      const mp = products.find((x) => x.type === 'monthly');
      return mp ? Math.max(0, p.priceCents - mp.priceCents) : p.priceCents;
    }
    return p.priceCents;
  };

  const showPlans = !subscription || showAllPlans;
  const selectedProduct = products.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="pp-page">
      {/* ── Header ── */}
      <header className="pp-header">
        <button type="button" className="pp-back" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="pp-header-label">{t('pp.header.label')}</span>
      </header>

      {/* ── Hero ── */}
      <section className="pp-hero">
        <div className="pp-hero-seal">{t('pp.hero.seal')}</div>
        <h1 className="pp-hero-title">{t('pp.hero.title1')}<br />{t('pp.hero.title2')}</h1>
        <p className="pp-hero-sub">{t('pp.hero.sub')}</p>
        <div className="pp-hero-divider"><span /></div>
      </section>

      <main className="pp-content">
        {/* ── Current subscription banner ── */}
        {subscription && !showAllPlans && (
          <div className="pp-sub-banner">
            <div className="pp-sub-banner-left">
              <span className="pp-sub-icon">◈</span>
              <div>
                <div className="pp-sub-name">{subscription.planName}</div>
                <div className="pp-sub-meta">
                  {subscription.musicRemaining !== null
                    ? t('pp.sub.remaining', { count: subscription.musicRemaining })
                    : t('pp.sub.unlimited')}
                  &ensp;·&ensp;<DaysLeft expiresAt={subscription.expiresAt} />
                </div>
              </div>
            </div>
            <button className="pp-sub-upgrade" onClick={() => setShowAllPlans(true)}>
              {t('pp.sub.viewAll')}
            </button>
          </div>
        )}

        {/* ── Plans ── */}
        {showPlans && (
          <>
            {subscription && (
              <p className="pp-renew-hint">{t('pp.renew.hint')}</p>
            )}

            <div className="pp-plans">
              {products.map((product) => {
                const available = canPurchase(product);
                const upgrade = isUpgrade(product);
                const price = displayPrice(product);
                const meta = PLAN_META[product.type] ?? PLAN_META['per_use'];
                const isSelected = selectedId === product.id;
                const isRecommended = meta.recommended && !subscription;
                const isCurrent = !available && !!subscription;

                return (
                  <div
                    key={product.id}
                    className={[
                      'pp-plan',
                      isSelected ? 'pp-plan--selected' : '',
                      isCurrent ? 'pp-plan--current' : '',
                      isRecommended ? 'pp-plan--recommended' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ '--plan-color': meta.color } as React.CSSProperties}
                    onClick={() => available && setSelectedId(product.id)}
                    role={available ? 'button' : undefined}
                    tabIndex={available ? 0 : undefined}
                    onKeyDown={(e) => e.key === 'Enter' && available && setSelectedId(product.id)}
                  >
                    {/* Top strip */}
                    <div className="pp-plan-strip" />

                    {/* Badges */}
                    {isRecommended && <div className="pp-plan-badge pp-plan-badge--rec">{t('pp.badge.recommended')}</div>}
                    {upgrade && <div className="pp-plan-badge pp-plan-badge--up">{t('pp.badge.upgrade')}</div>}
                    {isCurrent && <div className="pp-plan-badge pp-plan-badge--cur">{t('pp.badge.current')}</div>}

                    {/* Icon + name */}
                    <div className="pp-plan-head">
                      <span className="pp-plan-icon">{meta.icon}</span>
                      <div>
                        <div className="pp-plan-name">{t(meta.nameKey)}</div>
                        <div className="pp-plan-tagline">{t(meta.taglineKey)}</div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="pp-plan-price-wrap">
                      {upgrade && (
                        <span className="pp-plan-price-orig">
                          {currency.symbol}{currency.formatAmount(currency.toDisplayCents(product.priceCents))}
                        </span>
                      )}
                      <span className="pp-plan-currency">{currency.symbol}</span>
                      <span className="pp-plan-amount">{currency.formatAmount(currency.toDisplayCents(price))}</span>
                      <span className="pp-plan-period">{t(meta.periodKey)}</span>
                    </div>

                    {/* Limit pill */}
                    <div className="pp-plan-limit">
                      {product.musicLimit === null
                        ? t('pp.limit.unlimited')
                        : `🎵 ${product.musicLimit} ${t('pp.limit.period')}`}
                    </div>

                    {/* Divider */}
                    <div className="pp-plan-sep" />

                    {/* Features */}
                    <ul className="pp-plan-features">
                      {meta.featureKeys.map((fk, i) => (
                        <li key={i} className="pp-plan-feature">
                          <span className="pp-feature-dot" />
                          {t(fk)}
                        </li>
                      ))}
                    </ul>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="pp-plan-check">
                        <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
                          <path d="M4 10l5 5 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="pp-cta-wrap">
              <button
                className="pp-cta"
                disabled={!selectedProduct}
                onClick={() => selectedProduct && navigate(`/checkout?product=${selectedProduct.id}`)}
              >
                {selectedProduct
                  ? t('pp.cta.select', { name: selectedProduct.name })
                  : t('pp.cta.selectPrompt')}
              </button>
              <p className="pp-cta-note">{t('pp.cta.note')}</p>
            </div>
          </>
        )}

        {/* ── Trust strip ── */}
        <div className="pp-trust">
          <div className="pp-trust-item">
            <span className="pp-trust-icon">🔒</span>
            <span>{t('pp.trust.security')}</span>
          </div>
          <div className="pp-trust-dot" />
          <div className="pp-trust-item">
            <span className="pp-trust-icon">⚡</span>
            <span>{t('pp.trust.instant')}</span>
          </div>
          <div className="pp-trust-dot" />
          <div className="pp-trust-item">
            <span className="pp-trust-icon">💬</span>
            <span>{t('pp.trust.support')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

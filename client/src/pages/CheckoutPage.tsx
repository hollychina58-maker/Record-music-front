import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService } from '../services/api';
import QRCode from 'qrcode';
import './CheckoutPage.css';

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

// Per-plan marketing features shown in the detail card
const PLAN_FEATURES: Record<string, { icon: string; text: string }[]> = {
  per_use: [
    { icon: '🎵', text: '每次生成一首专属配乐' },
    { icon: '⚡', text: '立即到账，无需订阅' },
    { icon: '🎨', text: 'AI 情感风格匹配' },
    { icon: '♾️', text: '永久有效，按需使用' },
  ],
  monthly: [
    { icon: '🎵', text: '每月 60 次音乐生成' },
    { icon: '🔄', text: '30 天持续有效' },
    { icon: '🎨', text: '全风格解锁：古典、民谣、电子…' },
    { icon: '⬆️', text: '可随时升级年度会员并抵扣费用' },
  ],
  yearly: [
    { icon: '♾️', text: '365 天无限次音乐生成' },
    { icon: '🎵', text: '全风格、全情绪解锁' },
    { icon: '🔒', text: '锁定最优价格，省心一整年' },
    { icon: '⭐', text: '专属年度会员标识' },
  ],
};

// SVG icons for payment providers
function AlipayIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" fill="none">
      <rect width="48" height="48" rx="10" fill="#1677FF" />
      <path d="M24 8C15.16 8 8 15.16 8 24s7.16 16 16 16 16-7.16 16-16S32.84 8 24 8zm8.5 21.5c-2.5-1-6.5-2.8-10-4.5-.8 1.5-2 3-4 3.8-3.5 1.3-6.5-.3-6.5-3.8 0-3 2.8-4.8 6.5-3.8 1 .3 2 .8 3 1.5V18h10v2H22v3.5c3.5 1.5 7.5 3.3 10.5 4.8l-1 3.2h1z"
        fill="white" />
    </svg>
  );
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" fill="none">
      <rect width="48" height="48" rx="10" fill="#07C160" />
      <path d="M19.5 12C13.15 12 8 16.48 8 22c0 3.1 1.6 5.88 4.1 7.8L11 33l4.2-2.1c1.4.4 2.8.6 4.3.6.3 0 .6 0 .9-.02-.1-.6-.15-1.2-.15-1.82 0-5.3 4.6-9.62 10.25-9.62.35 0 .7.02 1.04.05C30.5 15.9 25.4 12 19.5 12zm-3.5 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
        fill="white" />
      <path d="M30.5 22.1c-4.7 0-8.5 3.32-8.5 7.4 0 4.1 3.8 7.42 8.5 7.42 1.1 0 2.15-.18 3.12-.52L37 38l-.9-2.88C37.8 33.6 39 31.48 39 29.5c0-4.08-3.8-7.4-8.5-7.4zm-3 5a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zm6 0a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
        fill="white" />
    </svg>
  );
}

function PaypalIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" fill="none">
      <rect width="48" height="48" rx="10" fill="#003087" />
      <path d="M31 13h-9.5c-.7 0-1.3.5-1.4 1.2l-4 22.6c-.1.5.3 1 .8 1H21c.5 0 1-.4 1.1-.9l1.1-7c.1-.7.7-1.2 1.4-1.2h3c4.8 0 7.5-2.3 8.2-6.8.3-2-.1-3.6-1-4.7C33.9 13.8 32.6 13 31 13z"
        fill="#009cde" />
      <path d="M33.8 17.2c-.1.6-.3 1.2-.5 1.8C31.9 23 29 25 24.7 25h-1.9c-.7 0-1.3.5-1.4 1.2l-1.5 9.5c-.1.5.3.9.8.9h4.4c.6 0 1.1-.4 1.2-1l1-6.3c.1-.6.6-1 1.2-1h.8c4.1 0 6.5-2 7.2-6 .3-1.8 0-3.2-.7-4.1z"
        fill="white" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  alipay: <AlipayIcon />,
  wechat: <WechatIcon />,
  paypal: <PaypalIcon />,
};

const PROVIDER_LABELS: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  paypal: 'PayPal',
};

const PROVIDER_COLORS: Record<string, string> = {
  alipay: '#1677FF',
  wechat: '#07C160',
  paypal: '#003087',
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [provider, setProvider] = useState<'alipay' | 'wechat' | 'paypal'>('alipay');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLL_COUNT = 45;
  const [polling, setPolling] = useState(false);
  const [pollStatusMsg, setPollStatusMsg] = useState('');

  const [step, setStep] = useState<'review' | 'payment'>('review');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [showQr, setShowQr] = useState(false);

  const productId = parseInt(searchParams.get('product') || '0', 10);
  const returnOrderIdStr = searchParams.get('order');
  const returnOrderId = returnOrderIdStr ? parseInt(returnOrderIdStr, 10) : null;
  const processedReturnRef = useRef<number | null>(null);

  const resetPaymentState = () => {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
    pollCountRef.current = 0;
    payingRef.current = false;
    setOrderId(null);
    setStep('review');
    setShowQr(false);
    setQrDataUrl(null);
    setQrLoading(false);
    setPolling(false);
    setPollStatusMsg('');
    setError('');
    setStatusMsg('');
    setProcessing(false);
    setProvider('alipay');
    setQuantity(1);
    setCouponCode('');
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  useEffect(() => {
    if (!returnOrderId || !isAuthenticated) return;
    if (processedReturnRef.current === returnOrderId) return;
    processedReturnRef.current = returnOrderId;
    setStatusMsg(t('checkout.processing'));
    verifyAndActivate(returnOrderId);
  }, [returnOrderId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login', { replace: true }); return; }
    if (!productId && !returnOrderId) { navigate('/payment', { replace: true }); return; }
    if (productId) { resetPaymentState(); loadProduct(); } else { setLoading(false); }
  }, [isAuthenticated, productId, navigate]);

  const loadProduct = async () => {
    try {
      const [productsRes, subRes] = await Promise.all([
        apiService.clientGet('/payments/products'),
        apiService.clientGet('/payments/subscription'),
      ]);
      const products = productsRes.data as Product[];
      setAllProducts(products);
      setSubscription(subRes.data);
      const found = products.find((p) => p.id === productId);
      if (!found) { navigate('/payment', { replace: true }); return; }
      setProduct(found);
    } catch { /**/ }
    finally { setLoading(false); }
  };

  const verifyAndActivate = async (id: number) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await apiService.clientPost('/payments/orders/' + id + '/verify');
        if (res.success) {
          if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
          setStatusMsg(t('checkout.paySuccess'));
          const { fetchCurrentUser } = useAuthStore.getState();
          await fetchCurrentUser();
          const next = new URLSearchParams(searchParams);
          next.delete('order');
          setSearchParams(next, { replace: true });
          processedReturnRef.current = null;
          setTimeout(() => navigate('/my-space'), 1500);
          return;
        }
      } catch (err: any) {
        if (err?.response?.status === 404) { setError(err?.response?.data?.error || t('checkout.payFail')); return; }
      }
    }
    setError(t('checkout.payTimeout'));
  };

  const creatingRef = useRef(false);
  const payingRef = useRef(false);

  const handleCreateOrder = async () => {
    if (!product || creatingRef.current) return;
    creatingRef.current = true;
    setProcessing(true);
    setError('');
    try { setStep('payment'); }
    finally { setProcessing(false); creatingRef.current = false; }
  };

  const handlePay = async () => {
    if (!product || payingRef.current) return;
    payingRef.current = true;
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
    setProcessing(true);
    setError('');

    try {
      let activeOrderId = orderId;
      if (!activeOrderId) {
        const orderRes = await apiService.clientPost('/payments/orders', {
          productId: product.id,
          quantity,
          provider,
          couponCode: couponCode.trim() || undefined,
        });
        if (!orderRes?.data?.orderId) { setError(t('checkout.createOrderFail')); return; }
        activeOrderId = orderRes.data.orderId;
        setOrderId(activeOrderId);
      }

      const payRes = await apiService.clientPost('/payments/orders/' + activeOrderId + '/pay');

      if (payRes.data.redirectUrl) {
        window.location.href = payRes.data.redirectUrl;
        return;
      }

      if (payRes.data.qrCode) {
        setQrLoading(true);
        const dataUrl = await QRCode.toDataURL(payRes.data.qrCode, {
          width: 240, margin: 2,
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
        setQrLoading(false);
        setShowQr(true);

        pollCountRef.current = 0;
        setPolling(true);
        const poll = async () => {
          pollCountRef.current++;
          if (pollCountRef.current > MAX_POLL_COUNT) {
            pollRef.current = null; setPolling(false); setProcessing(false);
            setError(t('checkout.payTimeout')); return;
          }
          try {
            const verifyRes = await apiService.clientPost('/payments/orders/' + activeOrderId + '/verify');
            if (verifyRes.success) {
              pollRef.current = null; setPolling(false);
              setStatusMsg(t('checkout.paySuccess'));
              const { fetchCurrentUser } = useAuthStore.getState();
              await fetchCurrentUser();
              setTimeout(() => navigate('/my-space'), 1500);
              return;
            }
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 404) {
              pollRef.current = null; setPolling(false); setProcessing(false);
              setError(err?.response?.data?.error || t('checkout.payFail')); return;
            }
            if (status === 400) {
              const data = err?.response?.data;
              setPollStatusMsg(data?.notFound ? t('checkout.awaitingScan') : t('checkout.polling'));
            }
          }
          const delay = Math.min(4000 + (pollCountRef.current - 1) * 2000, 30000);
          pollRef.current = setTimeout(poll, delay);
        };
        pollRef.current = setTimeout(poll, 0);
        return;
      }

      setError(t('checkout.payFail'));
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || t('checkout.payFail');
      setError(status === 404 ? `${t('checkout.createOrderFail')} — ${msg}` : msg);
    } finally {
      setProcessing(false);
      payingRef.current = false;
    }
  };

  if (loading || !product) {
    return (
      <div className="checkout-page">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  const isUpgrade = !!(subscription && subscription.planType === 'monthly' && product.type === 'yearly');
  const unitPriceCents = (() => {
    if (isUpgrade) {
      const mp = allProducts.find((p) => p.type === 'monthly');
      if (mp) return Math.max(0, product.priceCents - mp.priceCents);
    }
    return product.priceCents;
  })();
  const totalCents = unitPriceCents * quantity;
  const features = PLAN_FEATURES[product.type] || [];
  const isPerUse = product.type === 'per_use';

  return (
    <div className="checkout-page">
      <header className="page-header">
        <button type="button" className="back-btn" onClick={() => {
          if (step === 'review') { navigate('/payment'); }
          else {
            if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
            setStep('review');
          }
        }} aria-label={t('common.back')}>
          <svg viewBox="0 0 24 24" className="back-icon">
            <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <h1 className="page-title">
          {step === 'review' ? '确认订单' : '选择支付方式'}
        </h1>
      </header>

      <main className="checkout-content">
        {statusMsg && <div className="payment-status">{statusMsg}</div>}

        {/* ── Step 1: Review ── */}
        {step === 'review' && (
          <>
            {/* Plan detail card */}
            <section className="plan-detail-card">
              <div className="plan-detail-header">
                <div className="plan-badge">{product.name}</div>
                {isUpgrade && <span className="upgrade-tag">升级优惠</span>}
              </div>

              <div className="plan-price-display">
                {isUpgrade && (
                  <span className="plan-price-original">¥{(product.priceCents / 100).toFixed(0)}</span>
                )}
                <span className="plan-price-main">¥{(unitPriceCents / 100).toFixed(2)}</span>
                <span className="plan-price-unit">
                  {isPerUse ? ' / 次' : product.type === 'monthly' ? ' / 月' : ' / 年'}
                </span>
              </div>

              <p className="plan-description">{product.description}</p>

              <ul className="plan-features">
                {features.map((f, i) => (
                  <li key={i} className="plan-feature-item">
                    <span className="feature-icon">{f.icon}</span>
                    <span className="feature-text">{f.text}</span>
                  </li>
                ))}
              </ul>

              {/* Music limit badge */}
              <div className="plan-limit-badge">
                {product.musicLimit === null ? (
                  <span>♾️ 无限次生成</span>
                ) : (
                  <span>🎵 {product.musicLimit} 次音乐生成</span>
                )}
              </div>
            </section>

            {/* Quantity (per_use only) */}
            {isPerUse && (
              <section className="order-section">
                <div className="order-row">
                  <span className="order-label">购买数量</span>
                  <div className="qty-control">
                    <button type="button" className="qty-btn" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                    <span className="qty-value">{quantity}</span>
                    <button type="button" className="qty-btn" onClick={() => setQuantity((q) => q + 1)}>+</button>
                  </div>
                </div>
              </section>
            )}

            {/* Coupon */}
            <div className="coupon-row">
              <input
                className="coupon-input"
                type="text"
                placeholder="优惠码（选填）"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                maxLength={30}
              />
            </div>

            {/* Total */}
            <div className="checkout-total-row">
              <span className="checkout-total-label">应付金额</span>
              <span className="checkout-total-amount">¥{(totalCents / 100).toFixed(2)}</span>
            </div>

            {error && <p className="payment-error">{error}</p>}

            <button className="checkout-btn" disabled={processing} onClick={handleCreateOrder}>
              {processing ? t('checkout.processing') : '继续 · 选择支付方式'}
            </button>

            <p className="payment-note">{t('checkout.note')}</p>
          </>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 'payment' && !showQr && (
          <>
            {/* Compact order recap */}
            <div className="payment-recap">
              <div className="payment-recap-name">{product.name}</div>
              <div className="payment-recap-amount">¥{(totalCents / 100).toFixed(2)}</div>
            </div>

            <section className="payment-method">
              <h3 className="section-title">选择支付方式</h3>
              <div className="provider-options">
                {(['alipay', 'wechat', 'paypal'] as const).map((p) => (
                  <label
                    key={p}
                    className={`provider-option${provider === p ? ' provider-option--active' : ''}`}
                    style={provider === p ? { borderColor: PROVIDER_COLORS[p] } : {}}
                  >
                    <input type="radio" name="provider" value={p} checked={provider === p}
                      onChange={() => { setProvider(p); setShowQr(false); }} />
                    <span className="provider-icon">{PROVIDER_ICONS[p]}</span>
                    <span className="provider-name">{PROVIDER_LABELS[p]}</span>
                    {provider === p && (
                      <span className="provider-check" style={{ color: PROVIDER_COLORS[p] }}>✓</span>
                    )}
                  </label>
                ))}
              </div>
            </section>

            {error && <p className="payment-error">{error}</p>}

            <button className="checkout-btn" disabled={processing} onClick={handlePay}
              style={!processing ? { background: PROVIDER_COLORS[provider] } : {}}>
              {processing
                ? t('checkout.processing')
                : <>{PROVIDER_ICONS[provider]}<span style={{ marginLeft: 8 }}>用 {PROVIDER_LABELS[provider]} 支付 ¥{(totalCents / 100).toFixed(2)}</span></>
              }
            </button>

            <p className="payment-note">{t('checkout.note')}</p>
          </>
        )}

        {/* QR code */}
        {showQr && (
          <section className="qr-section">
            <div className="qr-placeholder">
              {qrDataUrl ? (
                <>
                  <div className="qr-provider-badge" style={{ background: PROVIDER_COLORS[provider] }}>
                    {PROVIDER_ICONS[provider]}
                    <span>{PROVIDER_LABELS[provider]}</span>
                  </div>
                  <img src={qrDataUrl} alt={`${PROVIDER_LABELS[provider]}付款码`} className="qr-image" />
                  <p className="qr-title">扫码完成支付</p>
                  <p className="qr-amount">¥{(totalCents / 100).toFixed(2)}</p>
                  {polling && (
                    <p className="qr-hint">
                      {pollStatusMsg || t('checkout.polling')}
                    </p>
                  )}
                </>
              ) : qrLoading ? (
                <>
                  <div className="qr-loading-spinner" />
                  <p className="qr-hint">{t('checkout.qrLoading')}</p>
                </>
              ) : (
                <>
                  <div className="qr-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" width="48" height="48">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="3" height="3" rx="0.5" />
                      <rect x="18" y="18" width="3" height="3" rx="0.5" />
                      <rect x="14" y="18" width="3" height="3" rx="0.5" />
                      <rect x="18" y="14" width="3" height="3" rx="0.5" />
                    </svg>
                  </div>
                  <p className="qr-hint">{t('checkout.qrLoading')}</p>
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

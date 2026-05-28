import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import './CheckoutPage.css';

interface Product {
  id: number;
  name: string;
  type: string;
  priceCents: number;
  musicLimit: number | null;
  description: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [provider, setProvider] = useState<'alipay' | 'wechat' | 'paypal'>('alipay');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Two-step flow: review → payment
  const [step, setStep] = useState<'review' | 'payment'>('review');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [showQr, setShowQr] = useState(false);

  const productId = parseInt(searchParams.get('product') || '0', 10);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!productId) {
      navigate('/payment', { replace: true });
      return;
    }
    loadProduct();
  }, [isAuthenticated, productId, navigate]);

  useEffect(() => {
    const order = searchParams.get('order');
    if (order) {
      setStatusMsg('正在验证支付...');
      verifyAndActivate(parseInt(order, 10));
    }
  }, [searchParams]);

  const loadProduct = async () => {
    try {
      const res = await apiService.clientGet('/payments/products');
      const found = (res.data as Product[]).find((p) => p.id === productId);
      if (!found) {
        navigate('/payment', { replace: true });
        return;
      }
      setProduct(found);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  const verifyAndActivate = async (id: number) => {
    try {
      const res = await apiService.clientPost('/payments/orders/' + id + '/verify');
      if (res.success) {
        setStatusMsg('支付成功！');
        const { updateFreeMusicCount } = useAuthStore.getState();
        const profile = await apiService.getMyProfile();
        updateFreeMusicCount(profile.freeMusicCount);
        setTimeout(() => navigate('/my-space'), 1500);
      } else {
        setError('支付验证失败');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || '支付验证失败');
    }
  };

  const handleCreateOrder = async () => {
    if (!product) return;
    setProcessing(true);
    setError('');

    try {
      const orderRes = await apiService.clientPost('/payments/orders', {
        productId: product.id,
        provider,
        couponCode: couponCode.trim() || undefined,
      });
      setOrderId(orderRes.data.orderId);
      setStep('payment');
    } catch (err: any) {
      setError(err?.response?.data?.error || '订单创建失败');
    } finally {
      setProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!orderId) return;
    setProcessing(true);
    setError('');

    try {
      if (provider === 'paypal') {
        const payRes = await apiService.clientPost('/payments/orders/' + orderId + '/pay');
        if (payRes.data.redirectUrl) {
          window.location.href = payRes.data.redirectUrl;
        }
      } else {
        // Alipay / WeChat — show QR placeholder directly (API not integrated yet)
        setShowQr(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || '支付创建失败');
    } finally {
      setProcessing(false);
    }
  };

  const providerLabels: Record<string, string> = {
    alipay: '支付宝',
    wechat: '微信支付',
    paypal: 'PayPal',
  };

  if (loading || !product) {
    return (
      <div className="checkout-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const totalCents = product.priceCents * quantity;

  return (
    <div className="checkout-page">
      <header className="page-header">
        <button type="button" className="back-btn" onClick={() => step === 'review' ? navigate('/payment') : setStep('review')} aria-label="返回">
          <svg viewBox="0 0 24 24" className="back-icon">
            <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <h1 className="page-title">{step === 'review' ? '确认订单' : '选择支付方式'}</h1>
      </header>

      <main className="checkout-content">
        {statusMsg && <div className="payment-status">{statusMsg}</div>}

        {/* Order summary — always visible */}
        <section className="order-summary">
          <h3 className="section-title">订单详情</h3>
          <div className="order-card">
            <div className="order-row">
              <span className="order-label">商品</span>
              <span className="order-value">{product.name}</span>
            </div>
            <div className="order-row">
              <span className="order-label">说明</span>
              <span className="order-value order-desc">{product.description}</span>
            </div>
            <div className="order-row">
              <span className="order-label">数量</span>
              <div className="qty-control">
                <button
                  type="button"
                  className="qty-btn"
                  disabled={quantity <= 1 || step === 'payment'}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  disabled={step === 'payment'}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="order-row">
              <span className="order-label">单价</span>
              <span className="order-value">¥{(product.priceCents / 100).toFixed(2)}</span>
            </div>
            <div className="order-row order-row--total">
              <span className="order-label">合计</span>
              <span className="order-total">¥{(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Coupon — only in review step */}
        {step === 'review' && (
          <div className="coupon-row">
            <input
              className="coupon-input"
              type="text"
              placeholder="优惠码（可选）"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              maxLength={30}
            />
          </div>
        )}

        {error && <p className="payment-error">{error}</p>}

        {/* Step 1: Review — show pay button */}
        {step === 'review' && (
          <button
            className="checkout-btn"
            disabled={processing}
            onClick={handleCreateOrder}
          >
            {processing ? '处理中...' : '支付'}
          </button>
        )}

        {/* Step 2: Payment — show provider selector + QR / pay button */}
        {step === 'payment' && !showQr && (
          <>
            <section className="payment-method">
              <h3 className="section-title">支付方式</h3>
              <div className="provider-options">
                <label className={`provider-option${provider === 'alipay' ? ' provider-option--active' : ''}`}>
                  <input type="radio" name="provider" value="alipay" checked={provider === 'alipay'} onChange={() => { setProvider('alipay'); setShowQr(false); }} />
                  <span className="provider-name">支付宝</span>
                </label>
                <label className={`provider-option${provider === 'wechat' ? ' provider-option--active' : ''}`}>
                  <input type="radio" name="provider" value="wechat" checked={provider === 'wechat'} onChange={() => { setProvider('wechat'); setShowQr(false); }} />
                  <span className="provider-name">微信支付</span>
                </label>
                <label className={`provider-option${provider === 'paypal' ? ' provider-option--active' : ''}`}>
                  <input type="radio" name="provider" value="paypal" checked={provider === 'paypal'} onChange={() => { setProvider('paypal'); setShowQr(false); }} />
                  <span className="provider-name">PayPal</span>
                </label>
              </div>
            </section>

            <button
              className="checkout-btn"
              disabled={processing}
              onClick={handlePay}
            >
              {processing ? '处理中...' : `确认支付 ¥${(totalCents / 100).toFixed(2)}`}
            </button>
          </>
        )}

        {/* QR code area (Alipay / WeChat) */}
        {showQr && (
          <section className="qr-section">
            <div className="qr-placeholder">
              <div className="qr-icon">
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
              <p className="qr-title">使用{providerLabels[provider]}扫码支付</p>
              <p className="qr-amount">¥{(totalCents / 100).toFixed(2)}</p>
              <p className="qr-hint">二维码加载中...</p>
              <p className="qr-note">支付接口接入后将显示真实二维码</p>
            </div>
          </section>
        )}

        {step !== 'payment' && (
          <p className="payment-note">支付由第三方安全处理，支持支付宝 / 微信 / PayPal</p>
        )}
      </main>
    </div>
  );
}

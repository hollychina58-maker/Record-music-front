import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import './AdminTable.css';
import './AdminProductsPage.css';

interface Product {
  id: number;
  name: string;
  type: string;
  price_cents: number;
  music_limit: number | null;
  description: string;
  is_active: number;
}

interface Coupon {
  id: number;
  code: string;
  discount_percent: number | null;
  discount_cents: number | null;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: number;
}

const emptyProduct = { name: '', type: 'monthly', price_cents: 0, music_limit: null as number | null, description: '' };
const emptyCoupon = { code: '', discount_percent: null as number | null, discount_cents: null as number | null, valid_from: '', valid_until: '', max_uses: null as number | null };

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Product form
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState(emptyProduct);

  // Coupon form
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState(emptyCoupon);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, cr] = await Promise.all([
        apiService.clientGet('/admin/products'),
        apiService.clientGet('/admin/coupons'),
      ]);
      setProducts(pr.data);
      setCoupons(cr.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Product CRUD
  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, type: p.type, price_cents: p.price_cents, music_limit: p.music_limit, description: p.description });
  };

  const handleSaveProduct = async () => {
    if (editingProduct) {
      await apiService.clientPut(`/admin/products/${editingProduct.id}`, {
        name: productForm.name, type: productForm.type, priceCents: productForm.price_cents,
        musicLimit: productForm.music_limit, description: productForm.description,
      });
    } else {
      await apiService.clientPost('/admin/products', {
        name: productForm.name, type: productForm.type, priceCents: productForm.price_cents,
        musicLimit: productForm.music_limit, description: productForm.description,
      });
    }
    setEditingProduct(null);
    setProductForm(emptyProduct);
    fetchData();
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('确定删除此套餐？')) return;
    try {
      await apiService.clientDelete(`/admin/products/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || '删除失败');
    }
  };

  // Coupon CRUD
  const handleEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code, discount_percent: c.discount_percent, discount_cents: c.discount_cents,
      valid_from: c.valid_from?.slice(0, 10) || '', valid_until: c.valid_until?.slice(0, 10) || '',
      max_uses: c.max_uses,
    });
  };

  const handleSaveCoupon = async () => {
    if (editingCoupon) {
      await apiService.clientPut(`/admin/coupons/${editingCoupon.id}`, {
        discountPercent: couponForm.discount_percent, discountCents: couponForm.discount_cents,
        validFrom: couponForm.valid_from || null, validUntil: couponForm.valid_until || null,
        maxUses: couponForm.max_uses,
      });
    } else {
      await apiService.clientPost('/admin/coupons', {
        code: couponForm.code, discountPercent: couponForm.discount_percent,
        discountCents: couponForm.discount_cents,
        validFrom: couponForm.valid_from || null, validUntil: couponForm.valid_until || null,
        maxUses: couponForm.max_uses,
      });
    }
    setEditingCoupon(null);
    setCouponForm(emptyCoupon);
    fetchData();
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('确定删除此优惠码？')) return;
    await apiService.clientDelete(`/admin/coupons/${id}`);
    fetchData();
  };

  if (loading) return <div className="admin-loading">加载中...</div>;

  const typeLabel = (t: string) => t === 'per_use' ? '按次' : t === 'monthly' ? '月卡' : '年卡';

  return (
    <div className="admin-table-page">
      <h1 className="admin-page-title">套餐与优惠管理</h1>

      {/* Products section */}
      <h2 className="admin-section-title">套餐列表</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>类型</th>
            <th>价格(元)</th>
            <th>次数限制</th>
            <th>描述</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{typeLabel(p.type)}</td>
              <td>¥{(p.price_cents / 100).toFixed(2)}</td>
              <td>{p.music_limit === null ? '无限' : p.music_limit}</td>
              <td className="td-content">{p.description}</td>
              <td>{p.is_active ? '启用' : '禁用'}</td>
              <td className="td-actions">
                <button className="admin-btn admin-btn-sm" onClick={() => handleEditProduct(p)}>编辑</button>
                <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDeleteProduct(p.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        className="admin-btn admin-btn-add"
        onClick={() => { setEditingProduct({} as Product); setProductForm(emptyProduct); }}
      >
        + 新增套餐
      </button>

      {/* Coupons section */}
      <h2 className="admin-section-title" style={{ marginTop: 40 }}>优惠码列表</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>优惠码</th>
            <th>折扣(%)</th>
            <th>减免(元)</th>
            <th>有效期</th>
            <th>使用/上限</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td><code>{c.code}</code></td>
              <td>{c.discount_percent ? `${c.discount_percent}%` : '-'}</td>
              <td>{c.discount_cents ? `¥${(c.discount_cents / 100).toFixed(2)}` : '-'}</td>
              <td>{c.valid_from ? `${c.valid_from.slice(0, 10)} ~ ${c.valid_until?.slice(0, 10)}` : '永久'}</td>
              <td>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
              <td className="td-actions">
                <button className="admin-btn admin-btn-sm" onClick={() => handleEditCoupon(c)}>编辑</button>
                <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDeleteCoupon(c.id)}>删除</button>
              </td>
            </tr>
          ))}
          {coupons.length === 0 && (
            <tr><td colSpan={7} className="td-empty">暂无优惠码</td></tr>
          )}
        </tbody>
      </table>

      <button
        className="admin-btn admin-btn-add"
        onClick={() => { setEditingCoupon({} as Coupon); setCouponForm(emptyCoupon); }}
      >
        + 新增优惠码
      </button>

      {/* Product Edit Modal */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingProduct.id ? '编辑套餐' : '新增套餐'}</h3>
            <label>名称</label>
            <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            <label>类型</label>
            <select value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}>
              <option value="per_use">按次付费</option>
              <option value="monthly">月度会员</option>
              <option value="yearly">年度会员</option>
            </select>
            <label>价格（分）</label>
            <input type="number" value={productForm.price_cents} onChange={(e) => setProductForm({ ...productForm, price_cents: parseInt(e.target.value) || 0 })} />
            <label>音乐次数限制（留空=无限）</label>
            <input type="number" value={productForm.music_limit ?? ''} onChange={(e) => setProductForm({ ...productForm, music_limit: e.target.value ? parseInt(e.target.value) : null })} />
            <label>描述</label>
            <input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            <div className="modal-actions">
              <button className="admin-btn" onClick={handleSaveProduct}>保存</button>
              <button className="admin-btn admin-btn-cancel" onClick={() => setEditingProduct(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Edit Modal */}
      {editingCoupon && (
        <div className="modal-overlay" onClick={() => setEditingCoupon(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCoupon.id ? '编辑优惠码' : '新增优惠码'}</h3>
            <label>优惠码</label>
            <input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} disabled={!!editingCoupon.id} />
            <label>折扣百分比（如 20 = 8折）</label>
            <input type="number" value={couponForm.discount_percent ?? ''} onChange={(e) => setCouponForm({ ...couponForm, discount_percent: e.target.value ? parseInt(e.target.value) : null })} />
            <label>固定减免（分）</label>
            <input type="number" value={couponForm.discount_cents ?? ''} onChange={(e) => setCouponForm({ ...couponForm, discount_cents: e.target.value ? parseInt(e.target.value) : null })} />
            <label>生效日期</label>
            <input type="date" value={couponForm.valid_from} onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })} />
            <label>过期日期</label>
            <input type="date" value={couponForm.valid_until} onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })} />
            <label>使用次数上限（留空=不限）</label>
            <input type="number" value={couponForm.max_uses ?? ''} onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value ? parseInt(e.target.value) : null })} />
            <div className="modal-actions">
              <button className="admin-btn" onClick={handleSaveCoupon}>保存</button>
              <button className="admin-btn admin-btn-cancel" onClick={() => setEditingCoupon(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

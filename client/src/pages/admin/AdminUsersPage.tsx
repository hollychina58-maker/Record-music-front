import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import './AdminTable.css';

interface UserRow {
  id: number;
  email: string;
  nickname: string;
  role: string;
  banned_until: string | null;
  story_count: number;
  created_at: string;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (q) params.set('q', q);
      const r = await apiService.clientGet(`/admin/users?${params}`);
      setUsers(r.data);
      setTotal(r.meta.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  const handleBan = async (id: number, bannedUntil: string | null) => {
    const label = bannedUntil ? `封禁用户 #${id} 到 ${bannedUntil}？` : `解封用户 #${id}？`;
    if (!window.confirm(label)) return;
    await apiService.clientPut(`/admin/users/${id}/ban`, { bannedUntil });
    fetchUsers(page, search);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`确定要删除用户 #${id} 吗？此操作不可撤销，将级联删除其所有内容。`)) return;
    try {
      await apiService.clientDelete(`/admin/users/${id}`);
      fetchUsers(page, search);
    } catch (err: any) {
      alert(err?.response?.data?.error || '删除失败');
    }
  };

  const totalPages = Math.ceil(total / limit);
  const isBanned = (u: UserRow) => u.banned_until && new Date(u.banned_until) > new Date();

  return (
    <div className="admin-table-page">
      <h1 className="admin-page-title">用户管理</h1>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="text"
          placeholder="搜索邮箱或昵称..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? <div className="admin-loading">加载中...</div> : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>邮箱</th>
                <th>昵称</th>
                <th>角色</th>
                <th>故事数</th>
                <th>状态</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.nickname || '-'}</td>
                  <td>{u.role === 'admin' ? '管理员' : '用户'}</td>
                  <td>{u.story_count}</td>
                  <td>
                    <span className={`status-badge ${isBanned(u) ? 'status-banned' : 'status-active'}`}>
                      {isBanned(u) ? '已封禁' : '正常'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="td-actions">
                    {isBanned(u) ? (
                      <button className="admin-btn admin-btn-sm" onClick={() => handleBan(u.id, null)}>
                        解封
                      </button>
                    ) : (
                      <button className="admin-btn admin-btn-sm admin-btn-warn" onClick={() => handleBan(u.id, '9999-12-31T00:00:00.000Z')}>
                        封禁
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDelete(u.id)}>
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="td-empty">暂无数据</td></tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

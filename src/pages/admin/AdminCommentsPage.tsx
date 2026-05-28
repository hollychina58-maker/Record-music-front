import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import './AdminTable.css';

interface CommentRow {
  id: number;
  content: string;
  author_name: string;
  story_id: number;
  story_title: string;
  like_count: number;
  created_at: string;
}

export function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchComments = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (q) params.set('q', q);
      const r = await apiService.clientGet(`/admin/comments?${params}`);
      setComments(r.data);
      setTotal(r.meta.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments(page, search);
  }, [page, search, fetchComments]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`确定要删除评论 #${id} 吗？`)) return;
    await apiService.clientDelete(`/admin/comments/${id}`);
    fetchComments(page, search);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="admin-table-page">
      <h1 className="admin-page-title">评论管理</h1>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="text"
          placeholder="搜索评论内容..."
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
                <th>内容</th>
                <th>作者</th>
                <th>所属故事</th>
                <th>点赞</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td className="td-content">{c.content}</td>
                  <td>{c.author_name}</td>
                  <td className="td-title">{c.story_title}</td>
                  <td>{c.like_count}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('zh-CN')}</td>
                  <td>
                    <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(c.id)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {comments.length === 0 && (
                <tr><td colSpan={7} className="td-empty">暂无数据</td></tr>
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

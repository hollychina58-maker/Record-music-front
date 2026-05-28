import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import './Dashboard.css';

interface Stats {
  userCount: number;
  storyCount: number;
  commentCount: number;
  musicCount: number;
  musicFailCount: number;
  todayRevenueCents: number;
  musicTrend: { day: string; count: number }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.clientGet('/admin/stats').then((r) => {
      setStats(r.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="admin-loading">加载中...</div>;
  }

  if (!stats) return null;

  const maxTrend = Math.max(1, ...stats.musicTrend.map((d) => d.count));

  return (
    <div className="dashboard">
      <h1 className="admin-page-title">仪表盘</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.userCount}</div>
          <div className="stat-label">用户总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.storyCount}</div>
          <div className="stat-label">故事总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.commentCount}</div>
          <div className="stat-label">评论总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.musicCount}</div>
          <div className="stat-label">音乐生成数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.musicFailCount}</div>
          <div className="stat-label">生成失败数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">¥{(stats.todayRevenueCents / 100).toFixed(2)}</div>
          <div className="stat-label">今日收入</div>
        </div>
      </div>

      <div className="trend-section">
        <h2 className="trend-title">近30天音乐生成趋势</h2>
        <div className="trend-chart">
          {stats.musicTrend.map((d) => (
            <div key={d.day} className="trend-bar-wrapper" title={`${d.day}: ${d.count}次`}>
              <div
                className="trend-bar"
                style={{ height: `${Math.max(4, (d.count / maxTrend) * 100)}%` }}
              />
              <div className="trend-bar-label">{d.day.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

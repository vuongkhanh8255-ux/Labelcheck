'use client';

import Link from 'next/link';
import { MOCK_SESSIONS, MOCK_BRANDS } from '@/lib/mock-data';
import { CheckSession } from '@/types';
import {
  Plus, CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronRight, BarChart3, TrendingUp, Package, Filter
} from 'lucide-react';
import { useState } from 'react';

function StatusBadge({ status }: { status: CheckSession['status'] }) {
  const config = {
    pass: { label: 'PASS', className: 'badge-pass', icon: '✅' },
    fail: { label: 'FAIL', className: 'badge-fail', icon: '❌' },
    warning: { label: 'CẢNH BÁO', className: 'badge-warning', icon: '⚠️' },
    pending: { label: 'ĐANG XỬ LÝ', className: 'badge-pending', icon: '⏳' },
  };
  const c = config[status];
  return (
    <span className={`badge ${c.className}`}>
      {c.icon} {c.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>{sub}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail' | 'warning'>('all');

  const sessions = MOCK_SESSIONS.filter(s => filter === 'all' || s.status === filter);
  const passCount = MOCK_SESSIONS.filter(s => s.status === 'pass').length;
  const failCount = MOCK_SESSIONS.filter(s => s.status === 'fail').length;
  const passRate = Math.round((passCount / MOCK_SESSIONS.length) * 100);

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Dashboard Kiểm tra Nhãn
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Quản lý và theo dõi tất cả các lần kiểm tra nhãn mỹ phẩm
          </p>
        </div>
        <Link href="/check" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
          }}>
            <Plus size={16} />
            Tạo Check Mới
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard
          label="Tổng số lần check"
          value={MOCK_SESSIONS.length}
          sub="Tất cả thời gian"
          color="var(--text-primary)"
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          sub={`${passCount}/${MOCK_SESSIONS.length} nhãn đạt`}
          color="var(--accent-green)"
        />
        <StatCard
          label="Cần xem lại"
          value={failCount}
          sub="Có lỗi cần sửa"
          color="var(--accent-red)"
        />
        <StatCard
          label="Brands đã check"
          value={new Set(MOCK_SESSIONS.map(s => s.brandId)).size}
          sub="Thương hiệu khác nhau"
          color="var(--accent-blue)"
        />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['all', 'pass', 'fail', 'warning'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filter === f ? 'var(--accent-blue)' : 'var(--border)',
              background: filter === f ? 'var(--accent-blue-glow)' : 'transparent',
              color: filter === f ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {f === 'all' ? 'Tất cả' : f === 'pass' ? '✅ Pass' : f === 'fail' ? '❌ Fail' : '⚠️ Cảnh báo'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Sản phẩm', 'Brand', 'Loại nhãn', 'Kết quả', 'Lỗi / Cảnh báo', 'Ngày check', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, i) => (
              <tr
                key={session.id}
                style={{
                  borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {session.productName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {session.volumeFormatted}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: MOCK_BRANDS.find(b => b.id === session.brandId)?.color || '#888',
                    }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{session.brandName}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    fontSize: '12px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}>
                    {session.labelType}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <StatusBadge status={session.status} />
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {session.totalErrors > 0 && (
                      <span style={{ fontSize: '13px', color: 'var(--accent-red)', fontWeight: 600 }}>
                        ❌ {session.totalErrors} lỗi
                      </span>
                    )}
                    {session.totalWarnings > 0 && (
                      <span style={{ fontSize: '13px', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                        ⚠ {session.totalWarnings} cảnh báo
                      </span>
                    )}
                    {session.totalErrors === 0 && session.totalWarnings === 0 && (
                      <span style={{ fontSize: '13px', color: 'var(--accent-green)' }}>Không có lỗi</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {new Date(session.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {session.checkedBy}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Link href={`/check/${session.id}`} style={{ textDecoration: 'none' }}>
                    <button style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 14px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}>
                      Xem <ChevronRight size={14} />
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sessions.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Không có kết quả phù hợp
          </div>
        )}
      </div>
    </div>
  );
}

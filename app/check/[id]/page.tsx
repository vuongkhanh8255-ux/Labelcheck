'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCheckSessionById, SavedCheckSession } from '@/lib/check-history';
import {
    ArrowLeft, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
    Info, Bot, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';

interface AICheckItem {
    id: string;
    field: string;
    expected: string;
    found: string;
    status: 'ok' | 'error' | 'warning';
    note: string;
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'ok') return <CheckCircle2 size={16} color="var(--accent-green)" />;
    if (status === 'error') return <XCircle size={16} color="var(--accent-red)" />;
    if (status === 'warning') return <AlertTriangle size={16} color="var(--accent-yellow)" />;
    return <MinusCircle size={16} color="var(--text-muted)" />;
}

function ContentSection({ title, items }: { title: string; items: AICheckItem[] }) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div style={{ marginBottom: '20px' }}>
            <button
                onClick={() => setExpanded(e => !e)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 0 12px',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: '12px',
                }}
            >
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>{title}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {items.filter(i => i.status === 'error').length > 0 && <span style={{ color: 'var(--accent-red)', marginRight: '8px' }}>❌ {items.filter(i => i.status === 'error').length}</span>}
                    {items.filter(i => i.status === 'warning').length > 0 && <span style={{ color: 'var(--accent-yellow)', marginRight: '8px' }}>⚠ {items.filter(i => i.status === 'warning').length}</span>}
                    {items.filter(i => i.status === 'ok').length > 0 && <span style={{ color: 'var(--accent-green)' }}>✅ {items.filter(i => i.status === 'ok').length}</span>}
                </span>
                {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
            </button>

            {expanded && items.map(item => (
                <div
                    key={item.id}
                    className={`result-item ${item.status}`}
                    style={{ marginBottom: '4px' }}
                >
                    <StatusIcon status={item.status} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.field}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Quy định: </span>{item.expected}
                        </div>
                        {item.found && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Tìm thấy: </span>{item.found}
                            </div>
                        )}
                        {item.note && (
                            <div style={{
                                fontSize: '12px',
                                color: item.status === 'error' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '4px',
                            }}>
                                <Info size={12} style={{ marginTop: '1px', flexShrink: 0 }} />
                                {item.note}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function CheckDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [session, setSession] = useState<SavedCheckSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = getCheckSessionById(id);
        if (saved) {
            setSession(saved);
        }
        setLoading(false);
    }, [id]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Bot size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <div>Đang tải...</div>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Bot size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <div style={{ marginBottom: '16px' }}>Không tìm thấy phiên kiểm tra này</div>
                    <Link href="/dashboard">
                        <button style={{
                            padding: '8px 20px',
                            background: 'var(--accent-orange-glow)',
                            border: '1px solid rgba(234, 88, 12, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--accent-orange)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}>
                            ← Quay lại Dashboard
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const aiResult = session.aiResult as { items?: AICheckItem[]; barcode?: Record<string, unknown>; summary?: { aiNote?: string } };
    const items: AICheckItem[] = aiResult?.items || [];
    const barcode = aiResult?.barcode as { numberMatch?: string; labelBarcodeNumber?: string; uploadedBarcodeNumber?: string; numberNote?: string; colorStatus?: string; colorNote?: string; sizeStatus?: string; sizeNote?: string } | undefined;
    const summary = aiResult?.summary;
    const currentStatus = session.status;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'var(--bg-card)',
                flexShrink: 0,
            }}>
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}>
                        <ArrowLeft size={14} /> Quay lại
                    </button>
                </Link>

                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {session.productName}
                        <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'var(--accent-orange-glow)',
                            color: 'var(--accent-orange)',
                            fontWeight: 700,
                        }}>
                            <Bot size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                            GPT-4o
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {session.brandName} · {session.labelType} · {session.volumeFormatted}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {session.totalErrors > 0 && (
                        <span style={{ fontSize: '13px', color: 'var(--accent-red)', fontWeight: 600 }}>❌ {session.totalErrors} lỗi</span>
                    )}
                    {session.totalWarnings > 0 && (
                        <span style={{ fontSize: '13px', color: 'var(--accent-yellow)', fontWeight: 600 }}>⚠ {session.totalWarnings} cảnh báo</span>
                    )}
                    <span className={`badge ${currentStatus === 'pass' ? 'badge-pass' : currentStatus === 'fail' ? 'badge-fail' : 'badge-warning'}`}>
                        {currentStatus === 'pass' ? '✅ PASS' : currentStatus === 'fail' ? '❌ FAIL' : '⚠️ CẢNH BÁO'}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left Panel: Summary */}
                <div style={{
                    width: '42%',
                    minWidth: '350px',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-secondary)',
                }}>
                    <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                        {/* AI Summary Card */}
                        {summary && (
                            <div style={{
                                padding: '16px',
                                background: currentStatus === 'pass'
                                    ? 'var(--accent-green-glow)'
                                    : 'var(--accent-red-glow)',
                                border: `1px solid ${currentStatus === 'pass' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                borderRadius: '12px',
                                marginBottom: '16px',
                            }}>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: currentStatus === 'pass' ? 'var(--accent-green)' : 'var(--accent-red)',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}>
                                    <Bot size={14} /> Nhận xét từ AI
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.6,
                                }}>
                                    {summary.aiNote || 'Không có nhận xét bổ sung.'}
                                </div>
                            </div>
                        )}

                        {/* Barcode Analysis */}
                        {barcode && (
                            <div style={{
                                padding: '16px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                marginBottom: '16px',
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📊 Phân tích Mã Vạch
                                </div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {barcode.numberMatch && (
                                        <div className={`result-item ${barcode.numberMatch}`}>
                                            <StatusIcon status={barcode.numberMatch} />
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>So khớp số mã vạch</div>
                                                {barcode.labelBarcodeNumber && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        Nhãn: <strong style={{ fontFamily: 'monospace' }}>{barcode.labelBarcodeNumber}</strong>
                                                    </div>
                                                )}
                                                {barcode.uploadedBarcodeNumber && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        Barcode gốc: <strong style={{ fontFamily: 'monospace' }}>{barcode.uploadedBarcodeNumber}</strong>
                                                    </div>
                                                )}
                                                {barcode.numberNote && (
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: barcode.numberMatch === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
                                                        marginTop: '4px',
                                                        fontWeight: 600,
                                                    }}>
                                                        {barcode.numberNote}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className={`result-item ${barcode.colorStatus || 'ok'}`}>
                                        <StatusIcon status={barcode.colorStatus || 'ok'} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Màu sắc & Tương phản</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{barcode.colorNote}</div>
                                        </div>
                                    </div>
                                    <div className={`result-item ${barcode.sizeStatus || 'ok'}`}>
                                        <StatusIcon status={barcode.sizeStatus || 'ok'} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Kích thước</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{barcode.sizeNote}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Session info */}
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Phiên kiểm tra
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                <div>📅 {new Date(session.createdAt).toLocaleString('vi-VN')}</div>
                                <div>🤖 {session.checkedBy}</div>
                                <div>📊 {session.totalOk} đạt · {session.totalErrors} lỗi · {session.totalWarnings} cảnh báo</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <Link href="/check" style={{ textDecoration: 'none', flex: 1 }}>
                                    <button style={{
                                        width: '100%',
                                        padding: '8px',
                                        background: 'var(--accent-orange-glow)',
                                        border: '1px solid rgba(234, 88, 12, 0.3)',
                                        borderRadius: '8px',
                                        color: 'var(--accent-orange)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                    }}>
                                        <RotateCcw size={12} /> Check mới
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Results */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', padding: '16px 20px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '12px 20px',
                            borderBottom: '2px solid var(--accent-orange)',
                            color: 'var(--accent-orange)',
                            fontSize: '14px',
                            fontWeight: 700,
                            marginBottom: '-1px',
                        }}>
                            📋 Kết quả kiểm tra AI
                        </div>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                        <div style={{
                            padding: '12px 16px',
                            background: 'var(--accent-orange-glow)',
                            borderRadius: '8px',
                            border: '1px solid rgba(234, 88, 12, 0.2)',
                            color: 'var(--accent-orange)',
                            fontSize: '13px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '20px',
                        }}>
                            <Bot size={16} />
                            Kết quả phân tích bởi GPT-4o Vision — {items.length} mục đã kiểm tra
                        </div>

                        {/* Stats cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                padding: '16px',
                                background: 'var(--accent-green-glow)',
                                borderRadius: '10px',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-green)' }}>
                                    {session.totalOk}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, marginTop: '4px' }}>ĐẠT</div>
                            </div>
                            <div style={{
                                padding: '16px',
                                background: 'var(--accent-red-glow)',
                                borderRadius: '10px',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-red)' }}>
                                    {session.totalErrors}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 600, marginTop: '4px' }}>LỖI</div>
                            </div>
                            <div style={{
                                padding: '16px',
                                background: 'var(--accent-yellow-glow)',
                                borderRadius: '10px',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-yellow)' }}>
                                    {session.totalWarnings}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: 600, marginTop: '4px' }}>CẢNH BÁO</div>
                            </div>
                        </div>

                        {/* Error items first */}
                        {items.filter(i => i.status === 'error').length > 0 && (
                            <ContentSection
                                title="❌ Lỗi cần sửa"
                                items={items.filter(i => i.status === 'error')}
                            />
                        )}

                        {/* Warning items */}
                        {items.filter(i => i.status === 'warning').length > 0 && (
                            <ContentSection
                                title="⚠️ Cảnh báo"
                                items={items.filter(i => i.status === 'warning')}
                            />
                        )}

                        {/* OK items */}
                        {items.filter(i => i.status === 'ok').length > 0 && (
                            <ContentSection
                                title="✅ Đạt chuẩn"
                                items={items.filter(i => i.status === 'ok')}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

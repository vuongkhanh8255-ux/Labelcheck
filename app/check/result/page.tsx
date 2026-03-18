'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
    Info, FileText, Layers, Bot, Download, RotateCcw,
    ChevronDown, ChevronUp
} from 'lucide-react';

interface AICheckItem {
    id: string;
    field: string;
    expected: string;
    found: string;
    status: 'ok' | 'error' | 'warning';
    note: string;
    accepted?: boolean;
}

interface AIBarcodeResult {
    detected: boolean;
    labelBarcodeNumber?: string;
    uploadedBarcodeNumber?: string | null;
    numberMatch?: string;
    numberNote?: string;
    colorStatus: string;
    colorNote: string;
    sizeStatus: string;
    sizeNote: string;
}

interface AISummary {
    totalOk: number;
    totalErrors: number;
    totalWarnings: number;
    overallStatus: 'pass' | 'fail';
    aiNote: string;
}

interface AIResult {
    items: AICheckItem[];
    barcode: AIBarcodeResult;
    summary: AISummary;
}

interface ResultPayload {
    aiResult: AIResult;
    productName: string;
    brandName: string;
    labelType: '>20ml' | '<20ml';
    volume: string;
    volumeFormatted: string;
    labelFileUrl: string | null;
    createdAt: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'ok') return <CheckCircle2 size={16} color="var(--accent-green)" />;
    if (status === 'error') return <XCircle size={16} color="var(--accent-red)" />;
    if (status === 'warning') return <AlertTriangle size={16} color="var(--accent-yellow)" />;
    return <MinusCircle size={16} color="var(--text-muted)" />;
}

function ContentSection({ title, items, onAccept }: {
    title: string;
    items: AICheckItem[];
    onAccept: (id: string) => void;
}) {
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
                    className={`result-item ${item.accepted ? 'accepted' : item.status}`}
                    style={{ marginBottom: '4px' }}
                >
                    <StatusIcon status={item.accepted ? 'skipped' : item.status} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: item.accepted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                    {item.field}
                                    {item.accepted && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-orange)' }}>(Đã chấp nhận)</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Quy định: </span>{item.expected}
                                </div>
                                {item.found && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Tìm thấy: </span>{item.found}
                                    </div>
                                )}
                                {item.note && !item.accepted && (
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
                            {(item.status === 'error' || item.status === 'warning') && !item.accepted && (
                                <button
                                    onClick={() => onAccept(item.id)}
                                    style={{
                                        padding: '4px 12px',
                                        background: 'rgba(234, 88, 12, 0.1)',
                                        border: '1px solid rgba(234, 88, 12, 0.3)',
                                        borderRadius: '6px',
                                        color: 'var(--accent-orange)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        marginLeft: '12px',
                                        flexShrink: 0,
                                    }}
                                >
                                    Accept
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ResultPage() {
    const router = useRouter();
    const [payload, setPayload] = useState<ResultPayload | null>(null);
    const [items, setItems] = useState<AICheckItem[]>([]);

    useEffect(() => {
        const raw = sessionStorage.getItem('labelcheck_result');
        if (!raw) {
            router.push('/check');
            return;
        }
        try {
            const data: ResultPayload = JSON.parse(raw);
            setPayload(data);
            setItems(data.aiResult.items || []);
        } catch {
            router.push('/check');
        }
    }, [router]);

    const handleAccept = (itemId: string) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, accepted: true } : i));
    };

    if (!payload) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Bot size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <div>Đang tải kết quả...</div>
                </div>
            </div>
        );
    }

    const { aiResult } = payload;
    const errors = items.filter(i => i.status === 'error' && !i.accepted);
    const warnings = items.filter(i => i.status === 'warning' && !i.accepted);
    const accepted = items.filter(i => i.accepted);

    // Split items into categories
    const contentItems = items.filter(i => !['ma_vach'].includes(i.id));
    const barcodeItems = items.filter(i => ['ma_vach'].includes(i.id));

    const currentStatus = errors.length === 0 ? 'pass' : 'fail';

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
                <Link href="/check" style={{ textDecoration: 'none' }}>
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
                        {payload.productName}
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
                        {payload.brandName} · {payload.labelType} · {payload.volumeFormatted}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {errors.length > 0 && (
                        <span style={{ fontSize: '13px', color: 'var(--accent-red)', fontWeight: 600 }}>❌ {errors.length} lỗi</span>
                    )}
                    {warnings.length > 0 && (
                        <span style={{ fontSize: '13px', color: 'var(--accent-yellow)', fontWeight: 600 }}>⚠ {warnings.length} cảnh báo</span>
                    )}
                    {accepted.length > 0 && (
                        <span style={{ fontSize: '13px', color: 'var(--accent-orange)', fontWeight: 600 }}>✓ {accepted.length} bỏ qua</span>
                    )}
                    <span className={`badge ${currentStatus === 'pass' ? 'badge-pass' : 'badge-fail'}`}>
                        {currentStatus === 'pass' ? '✅ PASS' : '❌ FAIL'}
                    </span>
                </div>
            </div>

            {/* Split View */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left Panel: Image + Info */}
                <div style={{
                    width: '42%',
                    minWidth: '350px',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-secondary)',
                }}>
                    <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                        {payload.labelFileUrl ? (
                            <div style={{
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid var(--border)',
                                background: '#fff',
                            }}>
                                <img
                                    src={payload.labelFileUrl}
                                    alt="Nhãn sản phẩm"
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                />
                            </div>
                        ) : (
                            <div style={{
                                height: '300px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--bg-primary)',
                                borderRadius: '12px',
                                border: '1px dashed var(--border-light)',
                                color: 'var(--text-muted)',
                            }}>
                                <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                <div>Không có ảnh preview</div>
                            </div>
                        )}

                        {/* AI Summary Card */}
                        {aiResult.summary && (
                            <div style={{
                                marginTop: '16px',
                                padding: '16px',
                                background: currentStatus === 'pass'
                                    ? 'var(--accent-green-glow)'
                                    : 'var(--accent-red-glow)',
                                border: `1px solid ${currentStatus === 'pass' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                borderRadius: '12px',
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
                                    {aiResult.summary.aiNote || 'Không có nhận xét bổ sung.'}
                                </div>
                            </div>
                        )}

                        {/* Barcode Analysis */}
                        {aiResult.barcode && aiResult.barcode.detected && (
                            <div style={{
                                marginTop: '16px',
                                padding: '16px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📊 Phân tích Mã Vạch
                                </div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {/* Barcode number comparison */}
                                    {aiResult.barcode.numberMatch && (
                                        <div className={`result-item ${aiResult.barcode.numberMatch}`}>
                                            <StatusIcon status={aiResult.barcode.numberMatch} />
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>So khớp số mã vạch</div>
                                                {aiResult.barcode.labelBarcodeNumber && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        Nhãn: <strong style={{ fontFamily: 'monospace' }}>{aiResult.barcode.labelBarcodeNumber}</strong>
                                                    </div>
                                                )}
                                                {aiResult.barcode.uploadedBarcodeNumber && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        Barcode gốc: <strong style={{ fontFamily: 'monospace' }}>{aiResult.barcode.uploadedBarcodeNumber}</strong>
                                                    </div>
                                                )}
                                                {aiResult.barcode.numberNote && (
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: aiResult.barcode.numberMatch === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
                                                        marginTop: '4px',
                                                        fontWeight: 600,
                                                    }}>
                                                        {aiResult.barcode.numberNote}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className={`result-item ${aiResult.barcode.colorStatus}`}>
                                        <StatusIcon status={aiResult.barcode.colorStatus} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Màu sắc & Tương phản</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{aiResult.barcode.colorNote}</div>
                                        </div>
                                    </div>
                                    <div className={`result-item ${aiResult.barcode.sizeStatus}`}>
                                        <StatusIcon status={aiResult.barcode.sizeStatus} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Kích thước</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{aiResult.barcode.sizeNote}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Session Info */}
                    <div style={{ padding: '16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Phiên kiểm tra
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <div>📅 {new Date(payload.createdAt).toLocaleString('vi-VN')}</div>
                            <div>🤖 Model: GPT-4o Vision</div>
                            {payload.usage && (
                                <div>📊 Tokens: {payload.usage.total_tokens.toLocaleString()}</div>
                            )}
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
                            <FileText size={14} /> Kết quả kiểm tra AI
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
                                    {items.filter(i => i.status === 'ok').length}
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
                                    {items.filter(i => i.status === 'error').length}
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
                                    {items.filter(i => i.status === 'warning').length}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: 600, marginTop: '4px' }}>CẢNH BÁO</div>
                            </div>
                        </div>

                        {/* Error items first */}
                        {items.filter(i => i.status === 'error').length > 0 && (
                            <ContentSection
                                title="❌ Lỗi cần sửa"
                                items={items.filter(i => i.status === 'error')}
                                onAccept={handleAccept}
                            />
                        )}

                        {/* Warning items */}
                        {items.filter(i => i.status === 'warning').length > 0 && (
                            <ContentSection
                                title="⚠️ Cảnh báo"
                                items={items.filter(i => i.status === 'warning')}
                                onAccept={handleAccept}
                            />
                        )}

                        {/* OK items */}
                        {items.filter(i => i.status === 'ok').length > 0 && (
                            <ContentSection
                                title="✅ Đạt chuẩn"
                                items={items.filter(i => i.status === 'ok')}
                                onAccept={handleAccept}
                            />
                        )}

                        {payload.labelType === '<20ml' && (
                            <div style={{
                                padding: '14px 16px',
                                background: 'var(--accent-yellow-glow)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '10px',
                                marginTop: '16px',
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-yellow)', marginBottom: '6px' }}>
                                    ⚠️ Sản phẩm &lt;20ml/20g — Quy tắc đặc biệt
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    Chỉ bắt buộc <strong>Tên sản phẩm</strong> và <strong>Số lô</strong> trên bao bì trực tiếp.
                                    Các thông tin còn lại cần có trên <strong>nhãn phụ hoặc bao bì ngoài</strong>.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

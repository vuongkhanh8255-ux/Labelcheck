'use client';

import { notFound } from 'next/navigation';
import { MOCK_SESSIONS, MOCK_BRANDS } from '@/lib/mock-data';
import { CheckItem, BarcodeCheckResult, CheckSession } from '@/types';
import { useState, use } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
    CheckCheck, BarChart3, Palette, Ruler, Scan, GitCompare,
    ChevronDown, ChevronUp, Info
} from 'lucide-react';

function StatusIcon({ status }: { status: CheckItem['status'] }) {
    if (status === 'ok') return <CheckCircle2 size={16} color="var(--accent-green)" />;
    if (status === 'error') return <XCircle size={16} color="var(--accent-red)" />;
    if (status === 'warning') return <AlertTriangle size={16} color="var(--accent-yellow)" />;
    return <MinusCircle size={16} color="var(--text-muted)" />;
}

function StatusEmoji({ status }: { status: CheckItem['status'] }) {
    if (status === 'ok') return <>✅</>;
    if (status === 'error') return <>❌</>;
    if (status === 'warning') return <>⚠️</>;
    return <>—</>;
}

function GaugeBar({ value, color }: { value: number; color: string }) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
            }}>
                <span>Khả năng quét (Scanability)</span>
                <span style={{ fontWeight: 700, color, fontSize: '18px' }}>{value}%</span>
            </div>
            <div className="gauge-track" style={{ height: '8px' }}>
                <div style={{
                    height: '100%',
                    width: `${value}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}99)`,
                    borderRadius: '999px',
                    transition: 'width 1s ease',
                    boxShadow: `0 0 8px ${color}66`,
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>0%</span>
                <span style={{ color: '#EF4444' }}>Ngưỡng tối thiểu: 70%</span>
                <span>100%</span>
            </div>
        </div>
    );
}

function BarcodeSection({ result }: { result: BarcodeCheckResult }) {
    const scanColor = result.scanability >= 80 ? 'var(--accent-green)' : result.scanability >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)';

    return (
        <div style={{ marginBottom: '24px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)',
            }}>
                <Scan size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Phân hệ Mã Vạch</span>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <GaugeBar value={result.scanability} color={scanColor} />
            </div>

            {[
                {
                    icon: <Palette size={14} />,
                    label: 'Màu sắc & Độ tương phản',
                    status: result.colorStatus,
                    note: result.colorNote,
                    detail: `Phát hiện: ${result.detectedColor}`,
                },
                {
                    icon: <Ruler size={14} />,
                    label: `Kích thước — ${result.width}cm × ${result.height}cm`,
                    status: result.widthStatus === 'ok' && result.heightStatus === 'ok' ? 'ok' : result.widthStatus === 'error' || result.heightStatus === 'error' ? 'error' : 'warning',
                    note: `Rộng: ${result.width}cm (min 2.5cm) | Cao: ${result.height}cm (min 1.3cm)`,
                    detail: `W: ${result.widthStatus === 'ok' ? '✅' : '❌'} | H: ${result.heightStatus === 'ok' ? '✅' : '❌'}`,
                },
                {
                    icon: <BarChart3 size={14} />,
                    label: 'Vùng trống (Quiet Zone)',
                    status: result.quietZoneStatus,
                    note: result.quietZoneNote,
                    detail: '',
                },
                {
                    icon: <GitCompare size={14} />,
                    label: 'So sánh với file gốc',
                    status: result.comparisonStatus,
                    note: result.comparisonNote,
                    detail: '',
                },
            ].map((item, i) => (
                <div key={i} className={`result-item ${item.status}`} style={{ marginBottom: '4px' }}>
                    <StatusIcon status={item.status as CheckItem['status']} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {item.icon} {item.label}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>{item.note}</div>
                        {item.detail && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>{item.detail}</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ContentSection({ title, items, onAccept }: {
    title: string;
    items: CheckItem[];
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
                                    {item.accepted && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-purple)' }}>(Đã chấp nhận)</span>}
                                </div>
                                {item.status !== 'ok' && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
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
                                        background: 'rgba(139, 92, 246, 0.1)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        borderRadius: '6px',
                                        color: 'var(--accent-purple)',
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

function LabelPreview({ session, highlightedId }: { session: CheckSession; highlightedId: string | null }) {
    // Simulated label preview with colored annotation boxes
    const allItems = session.contentItems.filter(i => i.region);

    return (
        <div style={{ position: 'relative', width: '100%', paddingTop: '140%', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Simulated label background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(160deg, #f8f9fa 0%, #e9ecef 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#333',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                    }}>
                        {session.brandName}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
                        {session.productName}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '16px' }}>
                        {session.volumeFormatted}
                    </div>
                    <div style={{ fontSize: '8px', color: '#888', lineHeight: 1.6, maxWidth: '180px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>INGREDIENTS:</div>
                        Water, Glycerin, Niacinamide, Adenosine, Green Tea Extract, Hyaluronic Acid, Panthenol...
                    </div>
                </div>
            </div>

            {/* Annotation overlays */}
            {allItems.map(item => {
                const isHighlighted = highlightedId === item.id;
                const color = item.status === 'ok' ? '#10B981' : item.status === 'error' ? '#EF4444' : '#F59E0B';
                return (
                    <div
                        key={item.id}
                        style={{
                            position: 'absolute',
                            left: `${item.region!.x}%`,
                            top: `${item.region!.y}%`,
                            width: `${item.region!.w}%`,
                            height: `${item.region!.h}%`,
                            border: `2px solid ${color}`,
                            borderRadius: '4px',
                            background: isHighlighted ? `${color}33` : `${color}11`,
                            transition: 'all 0.2s ease',
                            boxShadow: isHighlighted ? `0 0 12px ${color}66` : 'none',
                        }}
                    />
                );
            })}

            {/* Legend */}
            <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                right: '8px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
            }}>
                {[
                    { color: '#10B981', label: 'Đúng' },
                    { color: '#EF4444', label: 'Sai' },
                    { color: '#F59E0B', label: 'Cảnh báo' },
                ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#555' }}>
                        <div style={{ width: '10px', height: '10px', border: `2px solid ${color}`, borderRadius: '2px' }} />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const session = MOCK_SESSIONS.find(s => s.id === id);
    if (!session) notFound();

    const [items, setItems] = useState(session.contentItems);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    const handleAccept = (itemId: string) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, accepted: true } : i));
    };

    const errors = items.filter(i => i.status === 'error' && !i.accepted);
    const warnings = items.filter(i => i.status === 'warning' && !i.accepted);
    const accepted = items.filter(i => i.accepted);

    const fixedItems = items.filter(i => ['logo', 'company'].includes(i.id));
    const variableItems = items.filter(i => ['product_name', 'product_name_vi', 'volume', 'ingredients', 'usage', 'notification_no', 'lot_number'].includes(i.id));
    const complianceItems = items.filter(i => ['forbidden_words', 'origin', 'pao', 'usp_claim'].includes(i.id));

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'var(--bg-secondary)',
                flexShrink: 0,
            }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                    }}>
                        <ArrowLeft size={14} /> Quay lại
                    </button>
                </Link>

                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {session.productName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {session.brandName} · {session.labelType} · {session.volumeFormatted}
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
                        <span style={{ fontSize: '13px', color: 'var(--accent-purple)', fontWeight: 600 }}>✓ {accepted.length} accepted</span>
                    )}
                    <span className={`badge ${errors.length === 0 ? 'badge-pass' : 'badge-fail'}`}>
                        {errors.length === 0 ? '✅ PASS' : '❌ FAIL'}
                    </span>
                </div>
            </div>

            {/* Split View */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left: Label Preview */}
                <div style={{
                    width: '38%',
                    minWidth: '300px',
                    padding: '20px',
                    borderRight: '1px solid var(--border)',
                    overflow: 'auto',
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Xem trước nhãn
                    </div>
                    <LabelPreview session={session} highlightedId={highlightedId} />

                    <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Thông tin check
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <div>📅 {new Date(session.createdAt).toLocaleString('vi-VN')}</div>
                            <div>👤 {session.checkedBy}</div>
                            <div>🏷 ID: <span className="font-mono" style={{ fontSize: '11px' }}>{session.id}</span></div>
                        </div>
                    </div>
                </div>

                {/* Right: Results */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Kết quả kiểm tra
                    </div>

                    {session.barcodeResult && (
                        <BarcodeSection result={session.barcodeResult} />
                    )}

                    {fixedItems.length > 0 && (
                        <ContentSection
                            title="📌 Thông tin cố định (theo Brand)"
                            items={fixedItems}
                            onAccept={handleAccept}
                        />
                    )}

                    {variableItems.length > 0 && (
                        <ContentSection
                            title="📝 Thông tin biến đổi (theo HSCB)"
                            items={variableItems}
                            onAccept={handleAccept}
                        />
                    )}

                    {complianceItems.length > 0 && (
                        <ContentSection
                            title="⚠️ Tuân thủ & Cảnh báo từ ngữ"
                            items={complianceItems}
                            onAccept={handleAccept}
                        />
                    )}

                    {session.labelType === '<20ml' && (
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
                                Các thông tin còn lại (Thành phần, Công dụng, Tổ chức chịu trách nhiệm...) cần có trên <strong>nhãn phụ hoặc bao bì ngoài</strong>.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

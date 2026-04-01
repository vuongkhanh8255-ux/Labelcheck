'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
    Info, FileText, Layers, Bot, Download, RotateCcw,
    ChevronDown, ChevronUp
} from 'lucide-react';

// Highlight differences between expected and found text
function highlightDiff(expected: string, found: string): React.ReactNode {
    const splitRegex = /([,.\-–()[\]{}!?:;"'])/g;
    const expWords = expected.toUpperCase().replace(splitRegex, m => ` ${m} `).split(/\s+/).filter(Boolean);
    const foundWords = found.toUpperCase().replace(splitRegex, m => ` ${m} `).split(/\s+/).filter(Boolean);
    const foundOriginal = found.replace(splitRegex, m => ` ${m} `).split(/\s+/).filter(Boolean);
    const expSet = new Set(expWords);

    // Find words/punctuation in found that differ from expected
    const result: React.ReactNode[] = [];
    let fi = 0;
    let ei = 0;

    for (let i = 0; i < foundOriginal.length; i++) {
        const fw = foundWords[i];
        // Check if this word exists at the right position in expected
        const isMatch = ei < expWords.length && expWords[ei] === fw;

        if (isMatch) {
            result.push(<span key={i}>{foundOriginal[i]} </span>);
            ei++;
        } else {
            // Check if word exists anywhere in expected
            if (expSet.has(fw)) {
                result.push(<span key={i}>{foundOriginal[i]} </span>);
                // Try to advance expected index
                const nextIdx = expWords.indexOf(fw, ei);
                if (nextIdx >= 0) ei = nextIdx + 1;
            } else {
                // Word not in expected — highlight red
                result.push(
                    <span key={i} style={{ color: '#dc2626', fontWeight: 700, textDecoration: 'underline', textDecorationStyle: 'wavy' as const }}>
                        {foundOriginal[i]}{' '}
                    </span>
                );
            }
        }
    }

    // Check for missing words in expected that aren't in found
    const foundSet = new Set(foundWords);
    const missing = expWords.filter(w => !foundSet.has(w));
    if (missing.length > 0) {
        result.push(
            <span key="missing" style={{ color: '#dc2626', fontWeight: 700, marginLeft: '4px' }}>
                [THIẾU: {missing.join(', ')}]
            </span>
        );
    }

    return <>{result}</>;
}

// Render note with numbered items on separate lines
function renderNote(note: string, status: string): React.ReactNode {
    const color = status === 'error' ? 'var(--accent-red)' : 'var(--accent-yellow)';
    // Split by numbered pattern: "1. ...", "2. ..." etc
    const parts = note.split(/(?=\d+\.\s)/);

    if (parts.length <= 1) {
        // Single note, no numbering
        return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <Info size={12} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{note}</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {parts.filter(p => p.trim()).map((part, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <Info size={12} style={{ marginTop: '2px', flexShrink: 0, color }} />
                    <span>{part.trim()}</span>
                </div>
            ))}
        </div>
    );
}

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
    geminiResult?: AIResult | null;
    productName: string;
    brandName: string;
    labelType: '>20ml' | '<20ml';
    volume: string;
    volumeFormatted: string;
    labelFileUrl: string | null;
    hscbFileUrl?: string | null;
    createdAt: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// Check if GPT and Gemini disagree on a specific item
function getDisagreement(itemId: string, gptItems: AICheckItem[], geminiItems: AICheckItem[]): { hasDisagreement: boolean; gptStatus: string; geminiStatus: string; geminiNote: string } {
    const gptItem = gptItems.find(i => i.id === itemId);
    const geminiItem = geminiItems.find(i => i.id === itemId);
    if (!gptItem || !geminiItem) return { hasDisagreement: false, gptStatus: gptItem?.status || '', geminiStatus: geminiItem?.status || '', geminiNote: '' };
    const disagree = gptItem.status !== geminiItem.status;
    return { hasDisagreement: disagree, gptStatus: gptItem.status, geminiStatus: geminiItem.status, geminiNote: geminiItem.note || '' };
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'ok') return <CheckCircle2 size={16} color="var(--accent-green)" />;
    if (status === 'error') return <XCircle size={16} color="var(--accent-red)" />;
    if (status === 'warning') return <AlertTriangle size={16} color="var(--accent-yellow)" />;
    return <MinusCircle size={16} color="var(--text-muted)" />;
}

function ContentSection({ title, items, onAccept, geminiItems }: {
    title: string;
    items: AICheckItem[];
    onAccept: (id: string) => void;
    geminiItems?: AICheckItem[];
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

            {expanded && items.map(item => {
                const disagreement = geminiItems && geminiItems.length > 0
                    ? getDisagreement(item.id, items, geminiItems)
                    : null;
                const geminiItem = geminiItems?.find(g => g.id === item.id);

                return (
                    <div
                        key={item.id}
                        className={`result-item ${item.accepted ? 'accepted' : item.status}`}
                        style={{
                            marginBottom: '4px',
                            borderLeft: disagreement?.hasDisagreement ? '3px solid #F59E0B' : undefined,
                        }}
                    >
                        <StatusIcon status={item.accepted ? 'skipped' : item.status} />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: item.accepted ? 'var(--text-muted)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {item.field}
                                        {item.accepted && <span style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>(Đã chấp nhận)</span>}
                                        {disagreement?.hasDisagreement && (
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                color: '#F59E0B',
                                                fontWeight: 700,
                                            }}>
                                                ⚡ Bất đồng
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Quy định: </span>{item.expected}
                                    </div>
                                    {item.found && (
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Tìm thấy: </span>
                                            {item.status === 'error' && item.expected ? highlightDiff(item.expected, item.found) : item.found}
                                        </div>
                                    )}
                                    {item.note && !item.accepted && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: item.status === 'error' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                                            marginTop: '4px',
                                        }}>
                                            <span style={{ fontSize: '10px', color: 'var(--accent-orange)', fontWeight: 600 }}>🟠 GPT: </span>
                                            {renderNote(item.note, item.status)}
                                        </div>
                                    )}
                                    {/* Show Gemini's opinion if it disagrees */}
                                    {disagreement?.hasDisagreement && geminiItem && (
                                        <div style={{
                                            fontSize: '12px',
                                            marginTop: '6px',
                                            padding: '6px 10px',
                                            background: 'rgba(66, 133, 244, 0.06)',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(66, 133, 244, 0.15)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '10px', color: '#4285F4', fontWeight: 700 }}>🔵 Gemini:</span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '1px 6px',
                                                    borderRadius: '3px',
                                                    fontWeight: 600,
                                                    background: geminiItem.status === 'ok' ? 'var(--accent-green-glow)' : geminiItem.status === 'error' ? 'var(--accent-red-glow)' : 'var(--accent-yellow-glow)',
                                                    color: geminiItem.status === 'ok' ? 'var(--accent-green)' : geminiItem.status === 'error' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                                                }}>
                                                    {geminiItem.status === 'ok' ? '✅ OK' : geminiItem.status === 'error' ? '❌ Lỗi' : '⚠ Cảnh báo'}
                                                </span>
                                            </div>
                                            {geminiItem.found && (
                                                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Tìm thấy: </span>{geminiItem.found}
                                                </div>
                                            )}
                                            {geminiItem.note && (
                                                <div style={{ color: '#4285F4', marginTop: '2px' }}>
                                                    {geminiItem.note}
                                                </div>
                                            )}
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
                );
            })}
        </div>
    );
}

export default function ResultPage() {
    const router = useRouter();
    const [payload, setPayload] = useState<ResultPayload | null>(null);
    const [items, setItems] = useState<AICheckItem[]>([]);
    const [geminiItems, setGeminiItems] = useState<AICheckItem[]>([]);
    const hasGemini = geminiItems.length > 0;

    useEffect(() => {
        const raw = sessionStorage.getItem('labelcheck_result');
        if (!raw) {
            router.push('/check');
            return;
        }
        try {
            const data: ResultPayload = JSON.parse(raw);
            setPayload(data);
            // GPT items (primary)
            const gptItems = data.aiResult?.items || [];
            setItems(gptItems);
            // Gemini items (secondary)
            const gItems = data.geminiResult?.items || [];
            setGeminiItems(gItems);
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
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {payload.productName}
                        {payload.aiResult && (
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
                        )}
                        {hasGemini && (
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(66, 133, 244, 0.1)',
                                color: '#4285F4',
                                fontWeight: 700,
                            }}>
                                <Bot size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                                Gemini
                            </span>
                        )}
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
                        {/* Label + HSCB Side by Side */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Nhãn sản phẩm</div>
                                {payload.labelFileUrl ? (
                                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
                                        <img src={payload.labelFileUrl} alt="Nhãn sản phẩm" style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer', maxHeight: '280px', objectFit: 'contain' }}
                                            onClick={() => window.open(payload.labelFileUrl!, '_blank')} />
                                    </div>
                                ) : (
                                    <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed var(--border-light)', color: 'var(--text-muted)', fontSize: '12px' }}>
                                        <FileText size={32} style={{ opacity: 0.3 }} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Hồ sơ công bố (HSCB)</div>
                                {payload.hscbFileUrl ? (
                                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
                                        <img src={payload.hscbFileUrl} alt="HSCB" style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer', maxHeight: '280px', objectFit: 'contain' }}
                                            onClick={() => window.open(payload.hscbFileUrl!, '_blank')} />
                                    </div>
                                ) : (
                                    <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed var(--border-light)', color: 'var(--text-muted)', fontSize: '12px' }}>
                                        HSCB: Không có
                                    </div>
                                )}
                            </div>
                        </div>

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
                            <div>🤖 GPT-4o {payload.aiResult ? '✅' : '❌'}</div>
                            <div>🤖 Gemini {hasGemini ? '✅' : '❌'}</div>
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
                        {/* Disagreement summary banner */}
                        {hasGemini && (() => {
                            const disagreements = items.filter(item => {
                                const d = getDisagreement(item.id, items, geminiItems);
                                return d.hasDisagreement;
                            });
                            if (disagreements.length === 0) return null;
                            return (
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(245, 158, 11, 0.08)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{ fontSize: '16px' }}>⚡</span>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-yellow)' }}>
                                            {disagreements.length} mục bất đồng giữa GPT-4o và Gemini
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            Các mục có icon ⚡ cần xem lại thủ công vì 2 AI đưa ra kết quả khác nhau
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

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
                            Kết quả phân tích{hasGemini ? ' bởi GPT-4o + Gemini' : ' bởi GPT-4o Vision'} — {items.length} mục đã kiểm tra
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

                        {items.filter(i => i.status === 'error').length > 0 && (
                            <ContentSection
                                title="❌ Lỗi cần sửa"
                                items={items.filter(i => i.status === 'error')}
                                onAccept={handleAccept}
                                geminiItems={geminiItems}
                            />
                        )}

                        {items.filter(i => i.status === 'warning').length > 0 && (
                            <ContentSection
                                title="⚠️ Cảnh báo"
                                items={items.filter(i => i.status === 'warning')}
                                onAccept={handleAccept}
                                geminiItems={geminiItems}
                            />
                        )}

                        {items.filter(i => i.status === 'ok').length > 0 && (
                            <ContentSection
                                title="✅ Đạt chuẩn"
                                items={items.filter(i => i.status === 'ok')}
                                onAccept={handleAccept}
                                geminiItems={geminiItems}
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

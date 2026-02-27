'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Brand, CheckFormData, LabelType } from '@/types';
import { formatVolumeLabel } from '@/lib/unit-converter';
import { ChevronRight, ChevronLeft, Upload, X, Check, Package, Building2, FileText, Barcode } from 'lucide-react';

const STEPS = ['Loại nhãn', 'Thương hiệu', 'Tải file & Nhập liệu', 'Xem lại'];

function StepIndicator({ current }: { current: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '40px' }}>
            {STEPS.map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div className={`step-dot ${i < current ? 'completed' : i === current ? 'active' : 'inactive'}`}>
                            {i < current ? <Check size={14} /> : i + 1}
                        </div>
                        <span style={{
                            fontSize: '11px',
                            color: i === current ? 'var(--accent-orange)' : i < current ? 'var(--accent-green)' : 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                        }}>
                            {label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div style={{
                            flex: 1,
                            height: '1px',
                            background: i < current ? 'var(--accent-green)' : 'var(--border)',
                            margin: '0 8px',
                            marginBottom: '20px',
                            transition: 'background 0.3s ease',
                        }} />
                    )}
                </div>
            ))}
        </div>
    );
}

function FileUploadZone({
    label, accept, file, onFile, icon: Icon, hint
}: {
    label: string;
    accept: string;
    file: File | null;
    onFile: (f: File | null) => void;
    icon: React.ElementType;
    hint: string;
}) {
    const [drag, setDrag] = useState(false);

    return (
        <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                {label}
            </label>
            {file ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'var(--accent-green-glow)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                }}>
                    <Check size={16} color="var(--accent-green)" />
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--accent-green)', fontWeight: 500 }}>{file.name}</span>
                    <button onClick={() => onFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <label
                    className={`upload-zone ${drag ? 'drag-over' : ''}`}
                    style={{ display: 'block', cursor: 'pointer' }}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => {
                        e.preventDefault();
                        setDrag(false);
                        const f = e.dataTransfer.files[0];
                        if (f) onFile(f);
                    }}
                >
                    <input
                        type="file"
                        accept={accept}
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                    />
                    <Icon size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Kéo thả hoặc click để chọn file
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>
                </label>
            )}
        </div>
    );
}

export default function CheckPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<CheckFormData>({
        labelType: null,
        brandId: '',
        productName: '',
        volume: '',
        unit: 'ml',
        labelFile: null,
        hscbFile: null,
        barcodeFile: null,
    });
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(true);

    useEffect(() => {
        const fetchBrands = async () => {
            const { data, error } = await supabase.from('brands').select('*');
            if (data) {
                setBrands(data.map(item => ({
                    id: item.id,
                    name: item.name,
                    logoUrl: item.logo_url || '',
                    qrCodeUrl: item.qr_code_url || '',
                    registeredCompanyName: item.registered_company_name,
                    address: item.address || '',
                    phone: item.phone || '',
                    website: item.website || '',
                    color: item.color || '#EA580C',
                })));
            }
            setLoadingBrands(false);
        };
        fetchBrands();
    }, []);

    const selectedBrand = brands.find(b => b.id === form.brandId);
    const volumeFormatted = form.volume ? formatVolumeLabel(form.volume, form.unit) : '';

    const canNext = () => {
        if (step === 0) return form.labelType !== null;
        if (step === 1) return form.brandId !== '';
        if (step === 2) return form.productName && form.volume && form.labelFile;
        return true;
    };

    const handleSubmit = () => {
        // In real app: POST to API. Here we redirect to a mock result.
        const mockId = form.labelType === '>20ml' ? 'chk-001' : 'chk-003';
        router.push(`/check/${mockId}`);
    };

    return (
        <div style={{ padding: '32px', maxWidth: '760px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Tạo Check Mới
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Kiểm tra nhãn mỹ phẩm theo quy định pháp luật
                </p>
            </div>

            <StepIndicator current={step} />

            <div className="card animate-slide-in" style={{ padding: '32px' }}>
                {/* Step 0: Label Type */}
                {step === 0 && (
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Chọn loại nhãn</h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            Phân loại theo dung tích/khối lượng sản phẩm
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {(['>20ml', '<20ml'] as LabelType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setForm(f => ({ ...f, labelType: type }))}
                                    style={{
                                        padding: '28px 24px',
                                        borderRadius: '12px',
                                        border: '2px solid',
                                        borderColor: form.labelType === type ? 'var(--accent-orange)' : 'var(--border)',
                                        background: form.labelType === type ? 'var(--accent-orange-glow)' : 'var(--bg-card)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <Package size={28} color={form.labelType === type ? 'var(--accent-orange)' : 'var(--text-muted)'} />
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: form.labelType === type ? 'var(--accent-orange)' : 'var(--text-primary)', marginTop: '12px' }}>
                                        {type}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                        {type === '>20ml'
                                            ? 'Nhãn đầy đủ — Kiểm tra toàn bộ thông tin bắt buộc'
                                            : 'Nhãn tinh gọn — Chỉ bắt buộc Tên SP & Số lô trên bao bì trực tiếp'}
                                    </div>
                                    {type === '<20ml' && (
                                        <div style={{
                                            marginTop: '10px',
                                            fontSize: '12px',
                                            color: 'var(--accent-yellow)',
                                            background: 'var(--accent-yellow-glow)',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            display: 'inline-block',
                                        }}>
                                            ⚠ Thông tin còn lại cần có trên nhãn phụ
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 1: Brand */}
                {step === 1 && (
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Chọn thương hiệu</h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            Hệ thống sẽ tự động load thông tin cố định của brand
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {loadingBrands ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Đang tải danh sách thương hiệu...</div>
                            ) : brands.map(brand => (
                                <button
                                    key={brand.id}
                                    onClick={() => setForm(f => ({ ...f, brandId: brand.id }))}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '2px solid',
                                        borderColor: form.brandId === brand.id ? brand.color : 'var(--border)',
                                        background: form.brandId === brand.id ? `${brand.color}15` : 'var(--bg-card)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            background: brand.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            color: 'white',
                                        }}>
                                            {brand.name[0]}
                                        </div>
                                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{brand.name}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        <div>{brand.registeredCompanyName}</div>
                                        <div style={{ color: 'var(--accent-orange)', marginTop: '2px' }}>{brand.website || <span style={{ opacity: 0.5 }}>Chưa cập nhật website</span>}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {selectedBrand && (
                            <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                background: 'var(--bg-card)',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Thông tin cố định sẽ được load
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        ['Công ty', selectedBrand.registeredCompanyName],
                                        ['Logo', selectedBrand.logoUrl ? 'Đã có (' + selectedBrand.logoUrl + ')' : 'Chưa có'],
                                        ['Mã QR', selectedBrand.qrCodeUrl ? 'Đã có (' + selectedBrand.qrCodeUrl + ')' : 'Chưa có'],
                                        ['Địa chỉ', selectedBrand.address],
                                        ['SĐT', selectedBrand.phone],
                                        ['Website', selectedBrand.website],
                                    ].map(([k, v]) => (
                                        <div key={k}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{k}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Files & Input */}
                {step === 2 && (
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Tải file & Nhập liệu</h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            Upload các tài liệu cần thiết và nhập thông tin sản phẩm
                        </p>

                        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                            <FileUploadZone
                                label="📄 File thiết kế nhãn (bắt buộc)"
                                accept=".pdf"
                                file={form.labelFile}
                                onFile={f => setForm(x => ({ ...x, labelFile: f }))}
                                icon={FileText}
                                hint="Chấp nhận file PDF"
                            />
                            <FileUploadZone
                                label="📋 File HSCB — Hồ sơ công bố"
                                accept=".pdf"
                                file={form.hscbFile}
                                onFile={f => setForm(x => ({ ...x, hscbFile: f }))}
                                icon={FileText}
                                hint="Chấp nhận file PDF"
                            />
                            <FileUploadZone
                                label="🔲 File mã vạch gốc"
                                accept=".pdf,.png,.jpg,.jpeg"
                                file={form.barcodeFile}
                                onFile={f => setForm(x => ({ ...x, barcodeFile: f }))}
                                icon={Barcode}
                                hint="Chấp nhận PDF, PNG, JPG"
                            />
                        </div>

                        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                    Tên sản phẩm (bắt buộc)
                                </label>
                                <input
                                    type="text"
                                    value={form.productName}
                                    onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                                    placeholder="VD: Green Tea Seed Serum"
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                    Dung tích / Khối lượng (bắt buộc)
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        value={form.volume}
                                        onChange={e => setForm(f => ({ ...f, volume: e.target.value }))}
                                        placeholder="VD: 150"
                                        style={{
                                            flex: 1,
                                            padding: '10px 14px',
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                    <select
                                        value={form.unit}
                                        onChange={e => setForm(f => ({ ...f, unit: e.target.value as 'ml' | 'g' }))}
                                        style={{
                                            padding: '10px 14px',
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="ml">ml</option>
                                        <option value="g">g</option>
                                    </select>
                                </div>
                                {volumeFormatted && (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: 'var(--accent-green-glow)',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        color: 'var(--accent-green)',
                                        fontFamily: 'monospace',
                                    }}>
                                        ✅ Format chuẩn: <strong>{volumeFormatted}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Xem lại trước khi gửi</h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            Kiểm tra thông tin trước khi hệ thống bắt đầu phân tích
                        </p>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {[
                                { label: 'Loại nhãn', value: form.labelType },
                                { label: 'Thương hiệu', value: selectedBrand?.name },
                                { label: 'Tên sản phẩm', value: form.productName },
                                { label: 'Định lượng', value: volumeFormatted },
                                { label: 'File nhãn', value: form.labelFile?.name || '—' },
                                { label: 'File HSCB', value: form.hscbFile?.name || 'Chưa tải (tùy chọn)' },
                                { label: 'File mã vạch', value: form.barcodeFile?.name || 'Chưa tải (tùy chọn)' },
                            ].map(({ label, value }) => (
                                <div key={label} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: 'var(--bg-primary)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            marginTop: '20px',
                            padding: '14px 16px',
                            background: 'var(--accent-orange-glow)',
                            borderRadius: '10px',
                            border: '1px solid rgba(234, 88, 12, 0.3)',
                            fontSize: '13px',
                            color: 'var(--accent-orange)',
                        }}>
                            🤖 Hệ thống sẽ sử dụng AI (OCR + Image Processing) để phân tích nhãn và trả kết quả trong vài giây.
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                    <button
                        onClick={() => setStep(s => s - 1)}
                        disabled={step === 0}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 20px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: step === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                            fontSize: '14px',
                            cursor: step === 0 ? 'not-allowed' : 'pointer',
                            opacity: step === 0 ? 0.5 : 1,
                        }}
                    >
                        <ChevronLeft size={16} /> Quay lại
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canNext()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 24px',
                                background: canNext() ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'var(--border)',
                                border: 'none',
                                borderRadius: '8px',
                                color: canNext() ? 'white' : 'var(--text-muted)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: canNext() ? 'pointer' : 'not-allowed',
                                boxShadow: canNext() ? '0 4px 16px rgba(234, 88, 12, 0.3)' : 'none',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Tiếp theo <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 28px',
                                background: 'linear-gradient(135deg, #10B981, #F97316)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                            }}
                        >
                            🚀 Bắt đầu kiểm tra
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

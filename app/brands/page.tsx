'use client';

import { useState, useEffect } from 'react';
import { Brand } from '@/types';
import { Plus, Edit2, Trash2, Building2, Globe, Phone, MapPin, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function BrandModal({ brand, onClose, onSave }: {
    brand: Partial<Brand> | null;
    onClose: () => void;
    onSave: (b: Brand) => void;
}) {
    const [form, setForm] = useState<Partial<Brand>>(brand || { color: '#EA580C' });
    const [loading, setLoading] = useState(false);

    const fields: { key: keyof Brand; label: string; placeholder: string }[] = [
        { key: 'name', label: 'Tên Brand', placeholder: 'VD: Innisfree' },
        { key: 'registeredCompanyName', label: 'Tên đầy đủ (ĐKKD)', placeholder: 'VD: AmorePacific Vietnam Co., Ltd.' },
        { key: 'logoUrl', label: 'Logo (URL)', placeholder: 'Link ảnh Logo' },
        { key: 'qrCodeUrl', label: 'Mã QR (URL)', placeholder: 'Link ảnh QR Code' },
        { key: 'address', label: 'Địa chỉ', placeholder: 'Địa chỉ đầy đủ' },
        { key: 'phone', label: 'Số điện thoại', placeholder: 'VD: 1800 1234' },
        { key: 'website', label: 'Website', placeholder: 'VD: www.brand.com.vn' },
    ];

    const handleSubmit = async () => {
        if (!form.name || !form.registeredCompanyName) return;
        setLoading(true);
        const submitData = {
            id: form.id || form.name.toLowerCase().replace(/\s/g, '-'),
            name: form.name,
            registered_company_name: form.registeredCompanyName,
            logo_url: form.logoUrl,
            qr_code_url: form.qrCodeUrl,
            address: form.address,
            phone: form.phone,
            website: form.website,
            color: form.color
        };

        const { data, error } = await supabase
            .from('brands')
            .upsert(submitData)
            .select()
            .single();

        setLoading(false);

        if (!error && data) {
            onSave({
                ...form,
                id: data.id,
                registeredCompanyName: data.registered_company_name,
                logoUrl: data.logo_url,
                qrCodeUrl: data.qr_code_url
            } as Brand);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div className="card animate-slide-in" style={{ width: '520px', padding: '28px', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{brand?.id ? 'Chỉnh sửa Brand' : 'Thêm Brand mới'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                    {fields.map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                {label}
                            </label>
                            <input
                                type="text"
                                value={(form[key] as string) || ''}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                placeholder={placeholder}
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
                            {(key === 'logoUrl' || key === 'qrCodeUrl') && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                                    💡 <strong>Mẹo:</strong> Tải ảnh lên <a href="https://imgbb.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-orange)', textDecoration: 'none', fontWeight: 600 }}>imgbb.com</a> để lấy link gốc (.png, .jpg) dán vào đây.
                                </div>
                            )}
                        </div>
                    ))}

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                            Màu thương hiệu
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={form.color || '#EA580C'}
                                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                style={{ width: '48px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', background: 'none' }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{form.color}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        padding: '10px 20px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}>
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !form.name || !form.registeredCompanyName}
                        style={{
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #F97316, #EA580C)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: (loading || !form.name || !form.registeredCompanyName) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !form.name || !form.registeredCompanyName) ? 0.6 : 1,
                        }}
                    >
                        {loading ? 'Đang lưu...' : 'Lưu vào Database'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function BrandsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [modalBrand, setModalBrand] = useState<Partial<Brand> | null | false>(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            const { data, error } = await supabase.from('brands').select('*');
            if (error) throw error;

            if (data) {
                const formattedBrands: Brand[] = data.map(item => ({
                    id: item.id,
                    name: item.name,
                    logoUrl: item.logo_url || '',
                    qrCodeUrl: item.qr_code_url || '',
                    registeredCompanyName: item.registered_company_name,
                    address: item.address || '',
                    phone: item.phone || '',
                    website: item.website || '',
                    color: item.color || '#EA580C',
                }));
                setBrands(formattedBrands);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa Brand này?')) return;
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (!error) {
            setBrands(prev => prev.filter(b => b.id !== id));
        } else {
            alert('Lỗi khi xóa: ' + error.message);
        }
    };

    const handleSave = (brand: Brand) => {
        setBrands(prev => {
            const exists = prev.find(b => b.id === brand.id);
            if (exists) return prev.map(b => b.id === brand.id ? brand : b);
            return [...prev, brand];
        });
        setModalBrand(false);
    };

    return (
        <div style={{ padding: '32px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px' }}>Quản lý Brands</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Quản lý dữ liệu Thương hiệu được lưu trên <strong>Supabase</strong>
                    </p>
                </div>
                <button
                    onClick={() => setModalBrand({})}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #F97316, #EA580C)',
                        border: 'none',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(234, 88, 12, 0.3)',
                    }}
                >
                    <Plus size={16} /> Thêm Brand
                </button>
            </div>

            {error && (
                <div style={{ padding: '16px', background: 'var(--accent-red-glow)', color: 'var(--accent-red)', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <strong>Lỗi tải dữ liệu Supabase:</strong> {error}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải dữ liệu từ Supabase...
                </div>
            ) : brands.length === 0 && !error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    Chưa có Brand nào. Hãy tải schema SQL lên Supabase để có dữ liệu mẫu.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {brands.map(brand => (
                        <div key={brand.id} className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '10px',
                                        background: brand.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        fontWeight: 800,
                                        color: 'white',
                                        boxShadow: `0 4px 12px ${brand.color}44`,
                                    }}>
                                        {brand.name[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{brand.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {brand.id}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={() => setModalBrand(brand)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(brand.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '4px' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '8px' }}>
                                {[
                                    { icon: <Building2 size={12} />, value: brand.registeredCompanyName },
                                    { icon: <MapPin size={12} />, value: brand.address },
                                    { icon: <Phone size={12} />, value: brand.phone },
                                    { icon: <Globe size={12} />, value: brand.website },
                                ].map(({ icon, value }, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <span style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }}>{icon}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{value || <span style={{ opacity: 0.5 }}>Chưa cập nhật</span>}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                marginTop: '14px',
                                padding: '8px 12px',
                                background: 'var(--bg-primary)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: brand.color }} />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{brand.color}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalBrand !== false && (
                <BrandModal
                    brand={modalBrand}
                    onClose={() => setModalBrand(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

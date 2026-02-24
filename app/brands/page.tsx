'use client';

import { useState } from 'react';
import { MOCK_BRANDS } from '@/lib/mock-data';
import { Brand } from '@/types';
import { Plus, Edit2, Trash2, Building2, Globe, Phone, MapPin, X, Check } from 'lucide-react';

function BrandModal({ brand, onClose, onSave }: {
    brand: Partial<Brand> | null;
    onClose: () => void;
    onSave: (b: Brand) => void;
}) {
    const [form, setForm] = useState<Partial<Brand>>(brand || { color: '#3B82F6' });

    const fields: { key: keyof Brand; label: string; placeholder: string }[] = [
        { key: 'name', label: 'Tên Brand', placeholder: 'VD: Innisfree' },
        { key: 'companyName', label: 'Tên công ty', placeholder: 'VD: AmorePacific Vietnam Co., Ltd.' },
        { key: 'address', label: 'Địa chỉ', placeholder: 'Địa chỉ đầy đủ' },
        { key: 'phone', label: 'Số điện thoại', placeholder: 'VD: 1800 1234' },
        { key: 'website', label: 'Website', placeholder: 'VD: www.brand.com.vn' },
    ];

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
                        </div>
                    ))}

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                            Màu thương hiệu
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={form.color || '#3B82F6'}
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
                        onClick={() => {
                            if (form.name && form.companyName) {
                                onSave({ ...form, id: form.id || form.name?.toLowerCase().replace(/\s/g, '-') } as Brand);
                            }
                        }}
                        style={{
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Lưu
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function BrandsPage() {
    const [brands, setBrands] = useState<Brand[]>(MOCK_BRANDS);
    const [modalBrand, setModalBrand] = useState<Partial<Brand> | null | false>(false);

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
                        Lưu trữ thông tin cố định của từng thương hiệu để tái sử dụng
                    </p>
                </div>
                <button
                    onClick={() => setModalBrand({})}
                    style={{
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
                    }}
                >
                    <Plus size={16} /> Thêm Brand
                </button>
            </div>

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
                                    onClick={() => setBrands(prev => prev.filter(b => b.id !== brand.id))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '4px' }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '8px' }}>
                            {[
                                { icon: <Building2 size={12} />, value: brand.companyName },
                                { icon: <MapPin size={12} />, value: brand.address },
                                { icon: <Phone size={12} />, value: brand.phone },
                                { icon: <Globe size={12} />, value: brand.website },
                            ].map(({ icon, value }, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <span style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }}>{icon}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{value}</span>
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

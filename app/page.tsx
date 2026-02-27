'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowRight, UploadCloud, Shield, BarChart3, Zap, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MOCK_BRANDS } from '@/lib/mock-data';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a1a12', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Banner */}
      <div style={{
        background: '#f97316',
        color: '#ffffff',
        textAlign: 'center',
        padding: '8px',
        fontSize: '13px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <span>✨ Cập nhật mới: Mô hình AI nhận diện nhãn tinh gọn dưới 20ml đã ra mắt!</span>
      </div>

      {/* Navbar */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '16px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: scrolled ? 'rgba(15, 15, 15, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(249, 115, 22, 0.1)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={18} color="#ffffff" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            LabelCheck <span style={{ color: '#f97316' }}>AI</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(249, 115, 22, 0.5)',
              borderRadius: '30px',
              color: '#f97316',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)'; e.currentTarget.style.borderColor = '#f97316'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.5)'; }}
            >
              Open Application <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        padding: '100px 20px 0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at top, rgba(249, 115, 22, 0.15) 0%, rgba(10, 10, 10, 0) 70%)',
      }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: '30px',
          border: '1px solid rgba(249, 115, 22, 0.2)', color: '#f97316', fontSize: '12px', fontWeight: 600,
          marginBottom: '32px', background: 'rgba(249, 115, 22, 0.05)'
        }}>
          <span style={{ width: '8px', height: '8px', background: '#f97316', borderRadius: '50%', display: 'inline-block', marginRight: '8px', boxShadow: '0 0 8px #f97316' }}></span>
          The ultimate tool for Beauty QA processes
        </div>

        <h1 style={{
          fontSize: '64px', fontWeight: 800, color: '#fff', maxWidth: '900px', margin: '0 auto 24px',
          lineHeight: 1.1, letterSpacing: '-0.03em'
        }}>
          Định chuẩn chất lượng với <br />
          <span style={{
            color: '#f97316', fontStyle: 'italic', fontFamily: 'serif', paddingRight: '12px'
          }}>LabelCheck AI</span>
        </h1>

        <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Hệ thống AI tự động đối chiếu và soát lỗi nhãn mác mỹ phẩm chuẩn quy định pháp luật. Tiết kiệm 80% thời gian duyệt, đảm bảo an toàn 100% trước khi ra thị trường.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '80px', position: 'relative' }}>
          <Link href="/check" style={{ textDecoration: 'none', position: 'relative', zIndex: 2 }}>
            <button style={{
              padding: '16px 40px', background: '#f97316', border: 'none', borderRadius: '30px',
              color: '#ffffff', fontSize: '18px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(249, 115, 22, 0.4)',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <span style={{ fontSize: '22px' }}>+</span> Truy cập
            </button>
          </Link>

          {/* Instruction Text & Arrows - Moved Below */}
          <div style={{ color: '#f97316', fontSize: '14px', fontWeight: 500, fontStyle: 'italic', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px', transform: 'rotate(-90deg)' }}>↳</div>
            Tiến hành kiểm duyệt <br /> nhãn mác ngay
          </div>
        </div>

        {/* Dashboard Mockup - Glassmorphism */}
        <div style={{
          maxWidth: '1100px', margin: '0 auto', background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px 24px 0 0', padding: '24px 24px 0', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10
        }}>
          {/* Mac window controls */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
          </div>

          {/* Fake Dashboard UI */}
          <div style={{ background: '#f8fafc', borderRadius: '16px 16px 0 0', height: '400px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '200px', background: '#fff', borderRight: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ width: '100%', height: '32px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '16px' }}></div>
              <div style={{ width: '70%', height: '20px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '12px' }}></div>
              <div style={{ width: '80%', height: '20px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '12px' }}></div>
              <div style={{ width: '60%', height: '20px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '12px' }}></div>
            </div>
            <div style={{ flex: 1, padding: '32px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-15px', right: '30%', background: '#ffedd5', color: '#ea580c', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20 }}>
                Hiển thị các Brands hiện có
                <div style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #ffedd5', position: 'absolute', bottom: '-6px', left: '20px' }}></div>
              </div>
              <div style={{ width: '40%', height: '36px', background: '#fff', borderRadius: '8px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {MOCK_BRANDS.slice(0, 3).map((brand, i) => (
                  <div key={brand.id} style={{
                    height: '120px',
                    background: i === 0 ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#fff',
                    borderRadius: '12px',
                    boxShadow: i === 0 ? '0 4px 12px rgba(249, 115, 22, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {brand.logoUrl ? (
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={brand.logoUrl} alt={brand.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <div style={{ width: '32px', height: '32px', background: i === 0 ? 'rgba(255,255,255,0.2)' : '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 0 ? '#fff' : brand.color, fontWeight: 'bold' }}>
                          {brand.name[0]}
                        </div>
                      )}

                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: i === 0 ? '#fff' : '#0f172a', marginBottom: '4px' }}>{brand.name}</div>
                      <div style={{ fontSize: '10px', color: i === 0 ? 'rgba(255,255,255,0.8)' : '#64748b' }}>{brand.registeredCompanyName.slice(0, 20)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* White Section: Features */}
      <div style={{ background: '#ffffff', color: '#0f172a', padding: '80px 48px', position: 'relative', zIndex: 11 }}>

        {/* Features Title */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: '30px',
            background: '#fff7ed', color: '#f97316', fontSize: '13px', fontWeight: 600, marginBottom: '16px'
          }}>
            • Tính năng nổi bật
          </div>
          <h2 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.02em', maxWidth: '600px', margin: '0 auto', lineHeight: 1.1 }}>
            Khám phá sức mạnh <br /> dữ liệu với <span style={{ fontStyle: 'italic', fontFamily: 'serif', color: '#f97316' }}>LabelCheck</span>
          </h2>
        </div>

        {/* Feature Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
          {[
            {
              icon: UploadCloud, color: '#3b82f6', bg: '#eff6ff',
              title: 'Upload & Connect seamlessly',
              desc: 'Kéo thả PDF, Hệ thống tự động bóc tách text và hình ảnh chỉ trong nháy mắt.'
            },
            {
              icon: Shield, color: '#10b981', bg: '#ecfdf5',
              title: 'Free & fast security',
              desc: 'Dữ liệu HSCB tĩnh được bảo mật an toàn. So khớp chéo tự động không sai sót.'
            },
            {
              icon: BarChart3, color: '#f59e0b', bg: '#fffbeb',
              title: 'Flexible reports',
              desc: 'Xuất kết quả kiểm tra dạng báo cáo chi tiết, phân rõ vùng Lỗi và Cảnh báo ngữ pháp.'
            },
            {
              icon: Package, color: '#8b5cf6', bg: '#f5f3ff',
              title: 'Format Analyzer',
              desc: 'Đo lường kích thước mã vạch, độ phân giải logo và các yếu tố in ấn vật lý.'
            },
            {
              icon: Zap, color: '#ec4899', bg: '#fdf2f8',
              title: 'AI Grammar Checker',
              desc: 'Tự động bắt các từ cấm y tế, check PAO và Claim theo chuẩn Bộ Y Tế.'
            },
            {
              icon: ShieldCheck, color: '#14b8a6', bg: '#f0fdfa',
              title: 'Cost & Analyzer reviews',
              desc: 'Tích hợp Database lưu Brand Info cố định, sử dụng lại cho nhiều lần audit.'
            }
          ].map((feat, i) => (
            <div key={i} style={{
              padding: '32px',
              background: '#f8fafc',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.05)'; e.currentTarget.style.background = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', background: feat.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
              }}>
                <feat.icon size={24} color={feat.color} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>{feat.title}</h3>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

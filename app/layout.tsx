import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'LabelCheck — Hệ thống Kiểm tra Nhãn Mỹ phẩm',
  description: 'Tự động kiểm tra nhãn mỹ phẩm và mã vạch theo quy định pháp luật',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <main style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--bg-primary)',
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

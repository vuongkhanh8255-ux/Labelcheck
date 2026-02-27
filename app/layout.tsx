import type { Metadata } from 'next';
import './globals.css';
import AppLayoutWrapper from '@/components/layout/AppLayoutWrapper';

export const metadata: Metadata = {
  title: 'LabelCheck AI — Hệ thống Kiểm tra Nhãn Mỹ phẩm',
  description: 'Tự động kiểm tra nhãn mỹ phẩm và mã vạch theo quy định pháp luật. Tiết kiệm 80% thời gian duyệt, đảm bảo an toàn 100%.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AppLayoutWrapper>
          {children}
        </AppLayoutWrapper>
      </body>
    </html>
  );
}

import '@/lib/polyfills';
import type { Metadata } from 'next';
import Script from 'next/script';
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
      <head>
        <Script src="/polyfill.js" strategy="beforeInteractive" />
        <Script id="map-polyfill" strategy="beforeInteractive">{`
          (function(){
            if(typeof Map!=='undefined'){
              if(!Map.prototype.getOrInsertComputed){
                Map.prototype.getOrInsertComputed=function(k,cb){
                  if(this.has(k))return this.get(k);
                  var v=cb(k);this.set(k,v);return v;
                };
              }
              if(!Map.prototype.getOrInsert){
                Map.prototype.getOrInsert=function(k,dv){
                  if(this.has(k))return this.get(k);
                  this.set(k,dv);return dv;
                };
              }
            }
          })();
        `}</Script>
      </head>
      <body>
        <AppLayoutWrapper>
          {children}
        </AppLayoutWrapper>
      </body>
    </html>
  );
}

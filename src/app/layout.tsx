import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUIT DRL - Quản lý Điểm Rèn Luyện Sinh Viên",
  description: "Ứng dụng tự quản lý, tính điểm và theo dõi mục tiêu điểm rèn luyện theo chuẩn Quyết định 3385/QĐ-DCT Trường Đại học Công Thương TP.HCM",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#003366",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased selection:bg-huit-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/common/ServiceWorkerRegister";
import { NetworkStatusIndicator } from "@/components/common/NetworkStatusIndicator";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUIT DRL - Quản lý Điểm Rèn Luyện Sinh Viên",
  description: "Hệ thống tự quản lý, tính điểm và theo dõi mục tiêu rèn luyện cá nhân theo Quyết định 3385/QĐ-DCT Đại học Công Thương TP.HCM",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-slate-900 selection:text-white dark:selection:bg-amber-400 dark:selection:text-slate-950">
        <ServiceWorkerRegister />
        <NetworkStatusIndicator />
        {children}
      </body>
    </html>
  );
}

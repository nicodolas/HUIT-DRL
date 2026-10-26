import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "vn.edu.huit.drl",
  appName: "HUIT Điểm Rèn Luyện",
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: true,
    url: process.env.CAPACITOR_SERVER_URL,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true, // Native Android network bridge bypasses WebView CORS & cookie blocks
    },
    CapacitorCookies: {
      enabled: true, // Sync native Android CookieManager with WebView
    },
  },
};

export default config;

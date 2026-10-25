import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "vn.edu.huit.drl",
  appName: "HUIT Điểm Rèn Luyện",
  webDir: "out",
  server: {
    // During local dev on mobile or test apk, can connect to live server URL
    androidScheme: "https",
  },
};

export default config;

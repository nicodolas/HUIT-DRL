/**
 * Application Environment & External Link Configuration
 * Centralizes all environment variables and external link templates
 * for easy backend migration and consistent client/server usage.
 */

export const APP_CONFIG = {
  // URLs & Navigation
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  huitPortalUrl: process.env.NEXT_PUBLIC_HUIT_PORTAL_URL || "https://sinhvien.huit.edu.vn",
  huitQd3385Url:
    process.env.NEXT_PUBLIC_HUIT_QD3385_URL ||
    "https://huit.edu.vn/tin-tuc/quy-dinh-danh-gia-ket-qua-ren-luyen-sinh-vien",
  sampleEvidenceDriveUrl:
    process.env.NEXT_PUBLIC_SAMPLE_EVIDENCE_DRIVE_URL ||
    "https://drive.google.com/drive/folders/sample-huit-drl-proofs",
  huitYouthUnionUrl:
    process.env.NEXT_PUBLIC_HUIT_YOUTH_UNION_URL || "https://doanhoi.huit.edu.vn",

  // Contacts & Support
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "drl@huit.edu.vn",
  supportHotline: process.env.NEXT_PUBLIC_SUPPORT_HOTLINE || "02838161673",

  // Security & Authentication Limits
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE_SECONDS) || 7 * 24 * 60 * 60,
  maxPointsPerActivity: 100,
  minPointsPerActivity: -100,
  maxRecordQuantity: 50,
  maxTitleLength: 255,
  maxNoteLength: 1000,
};

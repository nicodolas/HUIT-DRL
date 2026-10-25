/**
 * Criteria Pinned Favorites Management
 * Allows students to star / pin frequently used DRL criteria presets for rapid 1-tap logging.
 */

import { DrlCriteriaPreset } from "@/lib/db/schema";

const STORAGE_KEY = "huit_favorite_preset_ids";

// Default recommended favorites for any new HUIT student
const DEFAULT_FAVORITES = [
  "TC3_CO_VU",          // Cổ vũ hoạt động cấp trường/khoa (+2đ)
  "TC3_CUOC_THI_KHOA",  // Tham gia cuộc thi cấp Khoa (+4đ)
  "TC5_HOI_THAO_TRUONG",// Hội thảo NCKH Trường (+5đ)
  "TC5_THANH_VIEN_CLB", // Thành viên CLB / Đội nhóm (+3đ)
];

export function getFavoritePresetIds(): string[] {
  if (typeof window === "undefined") return DEFAULT_FAVORITES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_FAVORITES;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

export function isFavoritePreset(presetIdOrCode: string): boolean {
  const favs = getFavoritePresetIds();
  return favs.includes(presetIdOrCode);
}

export function toggleFavoritePreset(presetIdOrCode: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const favs = getFavoritePresetIds();
    let next: string[];
    let added = false;
    if (favs.includes(presetIdOrCode)) {
      next = favs.filter((id) => id !== presetIdOrCode);
      added = false;
    } else {
      next = [...favs, presetIdOrCode];
      added = true;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return added;
  } catch {
    return false;
  }
}

export function getFavoritePresets(presets: DrlCriteriaPreset[]): DrlCriteriaPreset[] {
  const favIds = getFavoritePresetIds();
  return presets.filter((p) => favIds.includes(p.id) || favIds.includes(p.code));
}

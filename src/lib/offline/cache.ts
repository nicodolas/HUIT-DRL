import { DrlRecord, Semester, DrlCriteriaPreset } from "../db/schema";
import { ScoreCalculationResult, GoalAnalysisResult } from "../drl/calculator";

const SEMESTER_CACHE_PREFIX = "huit_drl_cache_sem_";
const SEMESTERS_LIST_CACHE = "huit_drl_cache_semesters_list";
const PRESETS_CACHE_KEY = "huit_drl_cache_presets";
const LAST_SYNC_KEY = "huit_drl_cache_last_sync";

export interface CachedSemesterData {
  records: DrlRecord[];
  scoreSummary?: ScoreCalculationResult | null;
  goalAnalysis?: GoalAnalysisResult | null;
  timestamp: number;
}

export function saveSemesterCache(
  semesterId: string,
  data: {
    records: DrlRecord[];
    scoreSummary?: ScoreCalculationResult | null;
    goalAnalysis?: GoalAnalysisResult | null;
  }
): void {
  if (typeof window === "undefined" || !semesterId) return;
  try {
    const payload: CachedSemesterData = {
      records: data.records,
      scoreSummary: data.scoreSummary,
      goalAnalysis: data.goalAnalysis,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${SEMESTER_CACHE_PREFIX}${semesterId}`, JSON.stringify(payload));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (e) {
    console.warn("Failed to cache semester data:", e);
  }
}

export function getSemesterCache(semesterId: string): CachedSemesterData | null {
  if (typeof window === "undefined" || !semesterId) return null;
  try {
    const raw = localStorage.getItem(`${SEMESTER_CACHE_PREFIX}${semesterId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Failed to read semester cache:", e);
    return null;
  }
}

export function saveUserSemestersCache(semesters: Semester[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEMESTERS_LIST_CACHE, JSON.stringify(semesters));
  } catch (e) {
    console.warn("Failed to cache semesters list:", e);
  }
}

export function getUserSemestersCache(): Semester[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SEMESTERS_LIST_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function savePresetsCache(presets: DrlCriteriaPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESETS_CACHE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn("Failed to cache presets:", e);
  }
}

export function getPresetsCache(): DrlCriteriaPreset[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRESETS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getLastSyncTime(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

export interface OfflineDraft {
  id: string;
  semesterId: string;
  presetId?: string | null;
  category: number;
  title: string;
  type: string;
  points: number | string;
  quantity: number;
  occurredAt?: string | null;
  note?: string | null;
  evidenceUrl?: string | null;
  createdAt: string;
}

const STORAGE_KEY = "huit_drl_offline_drafts";

export function getOfflineDrafts(): OfflineDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read offline drafts:", e);
    return [];
  }
}

export function addOfflineDraft(draft: Omit<OfflineDraft, "id" | "createdAt">): OfflineDraft {
  const drafts = getOfflineDrafts();
  const newDraft: OfflineDraft = {
    ...draft,
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  drafts.push(newDraft);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error("Failed to save offline draft:", e);
  }
  return newDraft;
}

export function removeOfflineDraft(id: string): void {
  const drafts = getOfflineDrafts().filter((d) => d.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error("Failed to remove offline draft:", e);
  }
}

export function clearOfflineDrafts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear offline drafts:", e);
  }
}

export async function syncOfflineDrafts(): Promise<{ synced: number; failed: number }> {
  const drafts = getOfflineDrafts();
  if (drafts.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: OfflineDraft[] = [];

  for (const draft of drafts) {
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (res.ok) {
        synced++;
      } else {
        failed++;
        remaining.push(draft);
      }
    } catch (e) {
      failed++;
      remaining.push(draft);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error(e);
  }

  return { synced, failed };
}

"use client";

import React, { useState, useEffect } from "react";
import { getOfflineDrafts, syncOfflineDrafts, OfflineDraft } from "@/lib/offline/drafts";
import { CloudUpload, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface OfflineSyncBannerProps {
  onSyncComplete?: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({ onSyncComplete }) => {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const checkDrafts = () => {
    setDrafts(getOfflineDrafts());
  };

  useEffect(() => {
    checkDrafts();

    const handleOnline = () => {
      checkDrafts();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  if (drafts.length === 0 && !syncMsg) {
    return null;
  }

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await syncOfflineDrafts();
      if (result.synced > 0) {
        setSyncMsg(`Đã đồng bộ thành công ${result.synced} hoạt động ngoại tuyến lên máy chủ!`);
        checkDrafts();
        if (onSyncComplete) onSyncComplete();
        setTimeout(() => setSyncMsg(null), 4000);
      } else if (result.failed > 0) {
        setSyncMsg(`Không thể đồng bộ (${result.failed} lỗi). Vui lòng kiểm tra lại kết nối.`);
      }
    } catch (e) {
      console.error(e);
      setSyncMsg("Lỗi đồng bộ. Vui lòng thử lại sau.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
      <div className="flex items-center space-x-2">
        <CloudUpload className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          {syncMsg ? (
            <span className="font-semibold text-emerald-800">{syncMsg}</span>
          ) : (
            <span>
              Phát hiện <strong>{drafts.length} hoạt động</strong> được ghi nhận ngoại tuyến khi mất mạng.
            </span>
          )}
        </div>
      </div>

      {drafts.length > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
        </button>
      )}
    </div>
  );
};

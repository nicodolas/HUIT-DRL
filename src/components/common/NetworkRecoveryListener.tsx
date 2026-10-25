"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { syncOfflineDrafts, getPendingDraftsCount } from "@/lib/offline/drafts";

interface NetworkRecoveryListenerProps {
  onSyncComplete?: () => void;
}

export const NetworkRecoveryListener: React.FC<NetworkRecoveryListenerProps> = ({
  onSyncComplete,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      const pendingCount = getPendingDraftsCount();
      if (pendingCount > 0) {
        setIsSyncing(true);
        setToastMessage(`Đã kết nối lại! Đang đồng bộ ${pendingCount} bản ghi offline...`);
        setShowToast(true);

        const result = await syncOfflineDrafts();
        setIsSyncing(false);
        setToastMessage(`Đã đồng bộ thành công ${result.synced} bản ghi lên máy chủ.`);
        onSyncComplete?.();
      } else {
        setToastMessage("Đã khôi phục kết nối Internet.");
        setShowToast(true);
        onSyncComplete?.();
      }

      setTimeout(() => setShowToast(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage("Mất kết nối mạng. Ứng dụng đã chuyển sang chế độ Offline an toàn.");
      setShowToast(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onSyncComplete]);

  if (!showToast && isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
      <div
        className={`pointer-events-auto flex items-center space-x-2 px-3.5 py-2 rounded-full shadow-lg text-xs font-semibold border backdrop-blur-md ${
          !isOnline
            ? "bg-slate-900/90 text-amber-400 border-amber-500/30"
            : isSyncing
            ? "bg-slate-900/90 text-white border-blue-500/30"
            : "bg-emerald-950/90 text-emerald-300 border-emerald-500/30"
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Mất mạng • Dữ liệu lưu offline an toàn</span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
            <span>{toastMessage}</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </>
        )}
      </div>
    </div>
  );
};

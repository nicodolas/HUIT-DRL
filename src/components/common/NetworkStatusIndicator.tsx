"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-md text-xs font-medium transition-all duration-300 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
      {isOnline ? (
        <div className="bg-emerald-900/90 backdrop-blur-xs text-white px-3 py-1 rounded-full flex items-center space-x-1.5 border border-emerald-700">
          <Wifi className="w-3.5 h-3.5 text-emerald-300" />
          <span>Đã kết nối lại Internet</span>
        </div>
      ) : (
        <div className="bg-amber-900/95 backdrop-blur-xs text-white px-3 py-1 rounded-full flex items-center space-x-1.5 border border-amber-700">
          <WifiOff className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Đang ngoại tuyến — Dữ liệu sẽ lưu tạm trên thiết bị</span>
        </div>
      )}
    </div>
  );
};

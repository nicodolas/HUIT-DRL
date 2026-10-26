"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  FileJson,
  ShieldCheck,
  Loader2,
} from "lucide-react";

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onRestoreComplete,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    setDownloading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Không thể tải bản sao lưu");
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `huit_drl_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: `Đã tải về thành công file sao lưu (${data.semesters?.length || 0} học kỳ, ${data.records?.length || 0} bản ghi).`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Lỗi khi tải bản sao lưu" });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      let backupData;
      try {
        backupData = JSON.parse(text);
      } catch {
        throw new Error("File không đúng định dạng JSON hợp lệ.");
      }

      if (!backupData.semesters || !Array.isArray(backupData.semesters)) {
        throw new Error("Cấu trúc file sao lưu không hợp lệ (thiếu danh sách học kỳ).");
      }

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Khôi phục dữ liệu thất bại");

      setStatusMessage({
        type: "success",
        text: `Khôi phục thành công ${resData.restoredSemesters || 0} học kỳ và ${resData.restoredRecords || 0} bản ghi!`,
      });

      onRestoreComplete();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Lỗi khi đọc file sao lưu" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Sao Lưu & Khôi Phục Dữ Liệu
              </h2>
              <p className="text-[11px] text-slate-300">
                Xuất hoặc nạp toàn bộ học kỳ & bản ghi điểm rèn luyện dưới dạng JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Option 1: Download JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                1. Tải về file sao lưu (JSON Backup)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Lưu giữ toàn bộ học kỳ, mục tự đánh giá và liên kết minh chứng vào một file an toàn trên máy của bạn.
            </p>
            <button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="w-full flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 dark:text-slate-950" />
                  <span>Đang tải xuống...</span>
                </>
              ) : (
                <>
                  <FileJson className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                  <span>Tải file sao lưu (.json)</span>
                </>
              )}
            </button>
          </div>

          {/* Option 2: Upload JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                2. Khôi phục từ file JSON đã lưu
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Nạp lại dữ liệu đã sao lưu trước đó hoặc chuyển đổi sang thiết bị di động mới mà không bị mất dữ liệu.
            </p>
            <label className="w-full flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer shadow-2xs">
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-slate-300" />
                  <span>Đang nạp dữ liệu...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span>Chọn file JSON để khôi phục</span>
                </>
              )}
              <input
                type="file"
                accept=".json,application/json"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Đảm bảo quyền riêng tư và an toàn dữ liệu học vụ</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

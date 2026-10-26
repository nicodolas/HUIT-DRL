"use client";

import React, { useState } from "react";
import {
  X,
  Settings,
  CalendarPlus,
  Users,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ExternalLink,
} from "lucide-react";
import { triggerHaptic } from "@/lib/native/platform";
import { APP_CONFIG } from "@/lib/config/env";

interface AdminHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Array<{
    id: string;
    name: string;
    isCurrent: boolean;
    submissionDeadline?: string | null;
    status?: string;
  }>;
  onSemesterCreated: (semester: any) => void;
  onOpenClassMeeting: () => void;
  adminName?: string;
}

export const AdminHubModal: React.FC<AdminHubModalProps> = ({
  isOpen,
  onClose,
  semesters,
  onSemesterCreated,
  onOpenClassMeeting,
  adminName,
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [name, setName] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên học kỳ");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          submissionDeadline: submissionDeadline || null,
          isCurrent,
          status: "active",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi tạo học kỳ");
      }

      triggerHaptic("medium");
      setSuccessMsg(`Đã tạo học kỳ chính thức "${name.trim()}" thành công!`);
      setName("");
      setSubmissionDeadline("");
      onSemesterCreated(data.semester);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetName: string) => {
    triggerHaptic("light");
    setName(presetName);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      data-testid="admin-hub-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Trung Tâm Quản Trị & CVHT
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Phân Quyền Admin
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quản lý các học kỳ chính thức toàn trường và các nghiệp vụ xét điểm rèn luyện
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 bg-slate-50/40 dark:bg-slate-900/40 gap-3">
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("create");
            }}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "create"
                ? "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Tạo học kỳ chính thức
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("manage");
            }}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "manage"
                ? "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Danh sách học kỳ ({semesters.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === "create" ? (
            <form onSubmit={handleCreateSemester} className="space-y-4">
              {/* Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Chọn mẫu học kỳ gợi ý:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Học kỳ 1 (2025 - 2026)",
                    "Học kỳ 2 (2025 - 2026)",
                    "Học kỳ 1 (2026 - 2027)",
                    "Học kỳ 2 (2026 - 2027)",
                    "Học kỳ Hè (2025 - 2026)",
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Semester Name Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên học kỳ chính thức: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Học kỳ 2 (2025 - 2026)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Học kỳ này sẽ tự động xuất hiện trên tài khoản của tất cả sinh viên toàn trường.
                </p>
              </div>

              {/* Deadline Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Hạn chót nộp bản tự đánh giá ĐRL (Điều 13):
                </label>
                <input
                  type="date"
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              {/* Is Current Checkbox */}
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-semibold">Đặt làm học kỳ hiện tại (Mặc định khi mở ứng dụng)</span>
              </label>

              {/* Quick Class Meeting Shortcut Banner */}
              <div className="p-3 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <strong className="block font-bold">Biên bản họp lớp & Đánh giá rèn luyện (Điều 9-10):</strong>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300">
                    Tạo biên bản A4 và tính tỷ lệ phân bổ xếp loại Xuất sắc, Tốt toàn lớp.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenClassMeeting();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  Mở biên bản
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>{loading ? "Đang tạo..." : "Xác nhận tạo học kỳ chính thức"}</span>
              </button>
            </form>
          ) : (
            /* Manage Tab */
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-500">
                Danh sách các học kỳ hiện hành:
              </div>

              {semesters.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {s.name}
                      </span>
                      {s.isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Đang hoạt động
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                      <span>Hạn nộp: {s.submissionDeadline || "Chưa thiết lập"}</span>
                      <span>•</span>
                      <span>Trạng thái: {s.status === "locked" ? "Đã khóa" : "Đang mở"}</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400">
                    Chính thức
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Official Resources & Sample Links */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center space-x-2 text-slate-500">
            <span>Liên kết chính thức:</span>
            <a
              href={APP_CONFIG.huitPortalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center space-x-0.5 underline"
            >
              <span>Cổng SV HUIT</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>•</span>
            <a
              href={APP_CONFIG.huitQd3385Url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center space-x-0.5 underline"
            >
              <span>QĐ 3385/QĐ-DCT</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="text-slate-400 font-mono text-[10px]">
            Hỗ trợ: {APP_CONFIG.supportEmail}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-xs cursor-pointer transition-colors shadow-xs"
          >
            Đóng bảng quản trị
          </button>
        </div>
      </div>
    </div>
  );
};


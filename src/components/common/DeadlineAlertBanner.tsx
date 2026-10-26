"use client";

import React, { useState } from "react";
import { Clock, CheckCircle2, AlertTriangle, Calendar, Lock } from "lucide-react";

interface DeadlineAlertBannerProps {
  semesterId: string;
  semesterName: string;
  deadline?: string | null;
  status?: string | null;
  isAdmin?: boolean;
  onUpdateSemester?: (updated: { submissionDeadline?: string | null; status?: string }) => void;
}

export const DeadlineAlertBanner: React.FC<DeadlineAlertBannerProps> = ({
  semesterId,
  semesterName,
  deadline,
  status = "active",
  isAdmin = false,
  onUpdateSemester,
}) => {
  const [editing, setEditing] = useState(false);
  const [newDeadline, setNewDeadline] = useState(deadline || "");
  const [saving, setSaving] = useState(false);

  // Calculate days remaining
  let daysDiff: number | null = null;
  let deadlineDateFormatted = "";

  if (deadline) {
    const d = new Date(deadline);
    if (!isNaN(d.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      daysDiff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      deadlineDateFormatted = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getFullYear()}`;
    }
  }

  const handleSaveDeadline = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: semesterId,
          submissionDeadline: newDeadline || null,
        }),
      });
      if (res.ok) {
        onUpdateSemester?.({ submissionDeadline: newDeadline || null });
        setEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (targetStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: semesterId,
          status: targetStatus,
        }),
      });
      if (res.ok) {
        onUpdateSemester?.({ status: targetStatus });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Render for submitted
  if (status === "submitted") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-bold text-emerald-900">
              Đã nộp điểm cho Ban cán sự lớp
            </div>
            <div className="text-[11px] text-emerald-700">
              Hồ sơ đang chờ phiên họp xét duyệt của tập thể lớp (Điều 13 QĐ 3385)
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleStatusChange("active")}
            disabled={saving}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
          >
            Mở lại chỉnh sửa
          </button>
        </div>
      </div>
    );
  }

  // Render for locked
  if (status === "locked") {
    return (
      <div className="bg-slate-100 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <Lock className="w-5 h-5 text-slate-500 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-800">
              Học kỳ đã khóa (Điểm chính thức)
            </div>
            <div className="text-[11px] text-slate-500">
              Hội đồng Khoa/Trường đã ra quyết định công nhận điểm rèn luyện
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleStatusChange("active")}
          disabled={saving}
          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
        >
          Mở khóa
        </button>
      </div>
    );
  }

  // Active status
  return (
    <div
      className={`rounded-xl px-4 py-3 border shadow-xs transition-colors ${
        daysDiff !== null && daysDiff < 0
          ? "bg-red-50 border-red-200 text-red-900"
          : daysDiff !== null && daysDiff <= 3
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : "bg-slate-50 border-slate-200 text-slate-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-2.5">
          {daysDiff !== null && daysDiff < 0 ? (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
          ) : daysDiff !== null && daysDiff <= 3 ? (
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <Calendar className="w-5 h-5 text-slate-500 shrink-0 mt-0.5 sm:mt-0" />
          )}

          <div>
            <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
              <span>Hạn chót nộp ĐRL:</span>
              {daysDiff === null ? (
                <span className="font-normal text-slate-500">Chưa thiết lập</span>
              ) : daysDiff < 0 ? (
                <span className="text-red-700 font-bold">
                  Đã quá hạn {Math.abs(daysDiff)} ngày ({deadlineDateFormatted})
                </span>
              ) : daysDiff === 0 ? (
                <span className="text-red-600 font-bold animate-pulse">
                  HÔM NAY là hạn chót!
                </span>
              ) : daysDiff <= 3 ? (
                <span className="text-amber-800 font-bold">
                  Còn {daysDiff} ngày ({deadlineDateFormatted})
                </span>
              ) : (
                <span className="text-slate-700 font-semibold">
                  Còn {daysDiff} ngày ({deadlineDateFormatted})
                </span>
              )}
            </div>
            <div className="text-[11px] opacity-80">
              {daysDiff !== null && daysDiff < 0
                ? "Liên hệ gấp Lớp trưởng để xin bổ sung hồ sơ xét duyệt"
                : "Nộp bản tự đánh giá và minh chứng trước phiên họp lớp (Điều 13)"}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {editing ? (
            <div className="flex items-center space-x-1.5">
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveDeadline}
                disabled={saving}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
            </div>
          ) : (
            <>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-2.5 py-1 text-[11px] font-medium border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg transition-colors cursor-pointer"
                  title="Thiết lập hạn nộp điểm cho toàn bộ sinh viên (Chỉ Admin)"
                >
                  {deadline ? "Đổi hạn nộp (Admin)" : "Đặt hạn nộp (Admin)"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStatusChange("submitted")}
                disabled={saving}
                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Đã nộp cho Lớp
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


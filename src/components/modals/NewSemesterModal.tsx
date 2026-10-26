"use client";

import React, { useState, useRef } from "react";
import { X, CalendarPlus } from "lucide-react";

interface NewSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (semester: any) => void;
}

export const NewSemesterModal: React.FC<NewSemesterModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [targetScore, setTargetScore] = useState(90);
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (!name.trim()) {
      setError("Vui lòng nhập tên học kỳ");
      submittingRef.current = false;
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetScore,
          disciplineLevel: "none",
          submissionDeadline: submissionDeadline || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi tạo học kỳ");
      }

      setName("");
      setSubmissionDeadline("");
      onCreated(data.semester);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Thêm học kỳ mới
              </h3>
              <p className="text-[11px] text-slate-500">
                Mặc định khởi tạo 60 điểm (TC 1, 2, 4)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 text-xs bg-red-50 text-red-700 rounded-lg font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Tên học kỳ:
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Học kỳ 2 (2025 - 2026)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Mục tiêu điểm rèn luyện:
            </label>
            <select
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            >
              <option value={90}>Xuất sắc (90 điểm)</option>
              <option value={80}>Tốt (80 điểm)</option>
              <option value={70}>Khá (70 điểm)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Hạn chót nộp ĐRL (tùy chọn):
            </label>
            <input
              type="date"
              value={submissionDeadline}
              onChange={(e) => setSubmissionDeadline(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Hạn chót nộp bản tự đánh giá cho Lớp trưởng theo Điều 13 QĐ 3385
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo học kỳ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

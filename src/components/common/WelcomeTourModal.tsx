"use client";

import React, { useEffect } from "react";
import { Sparkles, X, Target, PlusCircle, Calendar, ArrowRight } from "lucide-react";

interface WelcomeTourModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onDismiss: () => void;
}

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({
  isOpen,
  onStartTour,
  onDismiss,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tour-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onDismiss();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Accent Top Gradient Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-indigo-600 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-[10px] font-bold text-amber-800 dark:text-amber-300 mb-1">
              <span>Hướng dẫn 1 phút</span>
            </div>
            <h2
              id="welcome-tour-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
            >
              Chào mừng bạn đến với HUIT-DRL!
            </h2>
          </div>
        </div>

        {/* Short Summary Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Hệ thống theo dõi & tính toán Điểm Rèn Luyện tự động chuẩn theo <strong>QĐ 3385/QĐ-DCT</strong>. Hãy dành 1 phút xem nhanh 3 thao tác cốt lõi:
        </p>

        {/* 3 Key Highlights */}
        <div className="space-y-2.5 mb-6">
          <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Đồng hồ điểm & 5 Tiêu chí:</span> Theo dõi xếp loại tức thời và mức trần điểm từng tiêu chí.
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <PlusCircle className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Ghi nhận hoạt động:</span> Chọn nhanh từ 65 mục tiêu chuẩn hoặc tự thêm minh chứng.
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Lịch trình & Chia sẻ:</span> Quản lý sự kiện sắp tới và nhận mã mời cùng bạn bè.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Để sau
          </button>
          <button
            type="button"
            id="tour-welcome-start-btn"
            onClick={onStartTour}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <span>Bắt đầu ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};


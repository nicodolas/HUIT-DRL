"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Images as ImagesIcon,
  GraduationCap,
  FileText,
  ChevronDown,
  Award,
  Calendar as CalendarIcon,
  FileQuestion,
  ShieldCheck,
  FileSpreadsheet,
  Database,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";
import { triggerHaptic } from "@/lib/native/platform";

interface StudentUtilitiesMenuProps {
  currentSemesterId: string;
  isAdmin?: boolean;
  onOpenAddModal: () => void;
  onOpenProofVault: () => void;
  onOpenForecastModal: () => void;
  onOpenSv5tModal: () => void;
  onOpenCalendarModal: () => void;
  onOpenAppealModal: () => void;
  onOpenAuditModal: () => void;
  onOpenCsvModal: () => void;
  onOpenBackupModal: () => void;
  onOpenClassMeetingModal?: () => void;
  onOpenAdminHub?: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const StudentUtilitiesMenu: React.FC<StudentUtilitiesMenuProps> = ({
  currentSemesterId,
  isAdmin = false,
  onOpenAddModal,
  onOpenProofVault,
  onOpenForecastModal,
  onOpenSv5tModal,
  onOpenCalendarModal,
  onOpenAppealModal,
  onOpenAuditModal,
  onOpenCsvModal,
  onOpenBackupModal,
  onOpenClassMeetingModal,
  onOpenAdminHub,
  onRefresh,
  loading = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Primary Action: Record Points */}
      <button
        onClick={() => {
          triggerHaptic("medium");
          onOpenAddModal();
        }}
        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer active:scale-98"
      >
        <Plus className="w-3.5 h-3.5 text-amber-400 dark:text-white" />
        <span>Ghi nhận điểm</span>
      </button>

      {/* Primary Action: Proof Vault */}
      <button
        onClick={() => {
          triggerHaptic("light");
          onOpenProofVault();
        }}
        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        title="Kho minh chứng hình ảnh và bảng đính kèm A4"
      >
        <ImagesIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>Kho minh chứng</span>
      </button>

      {/* Primary Action: Graduation Forecast */}
      <button
        onClick={() => {
          triggerHaptic("light");
          onOpenForecastModal();
        }}
        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        title="Dự báo và mô phỏng điểm ĐRL tốt nghiệp toàn khóa Điều 12"
      >
        <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="hidden sm:inline">Dự báo tốt nghiệp</span>
        <span className="sm:hidden">Dự báo</span>
      </button>

      {/* Primary Action: Form 01 Report */}
      <Link
        href={`/report?semesterId=${currentSemesterId}`}
        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        title="Xuất phiếu đánh giá Form 01 theo QĐ 3385"
      >
        <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
        <span>Xuất phiếu QĐ 3385</span>
      </Link>

      {/* Student Utilities Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            triggerHaptic("light");
            setDropdownOpen(!dropdownOpen);
          }}
          className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer border border-transparent dark:border-slate-700"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <span>Tiện ích khác</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in duration-150">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Hồ sơ & Công cụ sinh viên
            </div>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenSv5tModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Thẩm định Sinh viên 5 Tốt</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenCalendarModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Đồng bộ Lịch (.ICS / Google)</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAppealModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <FileQuestion className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Soạn đơn khiếu nại (Điều 13)</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAuditModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Kiểm tra tính hợp lệ hồ sơ</span>
            </button>

            {!isAdmin && onOpenClassMeetingModal && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenClassMeetingModal();
                }}
                className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
              >
                <Users className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Họp lớp & Biên bản</span>
              </button>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Dữ liệu & Sao lưu
            </div>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenCsvModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Xuất / Nhập Excel CSV</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenBackupModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <Database className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Sao lưu & Phục hồi JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Management Hub Button (Only visible if Admin) */}
      {isAdmin && (
        <div className="flex items-center space-x-1.5 pl-1 border-l border-slate-200 dark:border-slate-700">
          {onOpenClassMeetingModal && (
            <button
              onClick={() => {
                triggerHaptic("medium");
                onOpenClassMeetingModal();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              title="Biên bản họp lớp và bảng tổng hợp rèn luyện Điều 9-10 (Dành cho CVHT/Admin)"
            >
              <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Họp lớp & Biên bản</span>
            </button>
          )}

          {onOpenAdminHub && (
            <button
              onClick={() => {
                triggerHaptic("medium");
                onOpenAdminHub();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              title="Bảng điều khiển quản trị viên và tạo học kỳ chính thức"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Quản trị CVHT</span>
            </button>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        title="Làm mới dữ liệu"
        aria-label="Làm mới dữ liệu"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
};

"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Images as ImagesIcon,
  FileText,
  ChevronDown,
  Download,
  Database,
  RefreshCw,
  Settings,
  GraduationCap,
} from "lucide-react";
import { triggerHaptic } from "@/lib/native/platform";

interface StudentUtilitiesMenuProps {
  currentSemesterId: string;
  isAdmin?: boolean;
  onOpenAddModal: () => void;
  onOpenProofVault: () => void;
  onOpenForecastModal: () => void;
  onOpenCsvModal: () => void;
  onOpenBackupModal: () => void;
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
  onOpenCsvModal,
  onOpenBackupModal,
  onOpenAdminHub,
  onRefresh,
  loading = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="flex items-center gap-2">
      {/* Primary Action: Record Points */}
      <button
        onClick={() => {
          triggerHaptic("medium");
          onOpenAddModal();
        }}
        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
      >
        <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950" />
        <span>Ghi hoạt động</span>
      </button>

      {/* Secondary Action: Proof Vault */}
      <button
        onClick={() => {
          triggerHaptic("light");
          onOpenProofVault();
        }}
        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer shrink-0"
        title="Kho ảnh minh chứng cá nhân"
      >
        <ImagesIcon className="w-3.5 h-3.5 text-indigo-500" />
        <span className="hidden sm:inline">Minh chứng</span>
      </button>

      {/* More Tools Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            triggerHaptic("light");
            setDropdownOpen(!dropdownOpen);
          }}
          className="flex items-center space-x-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer border border-transparent dark:border-slate-700"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          title="Tiện ích khác"
        >
          <span>Tiện ích</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in duration-100">
            <Link
              href={`/report?semesterId=${currentSemesterId}`}
              onClick={() => setDropdownOpen(false)}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất phiếu Form 01 (QĐ 3385)</span>
            </Link>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenForecastModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Dự phóng tốt nghiệp</span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenCsvModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất / Nhập CSV</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenBackupModal();
              }}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Sao lưu dữ liệu cá nhân</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Management Hub Button (Only if Admin role) */}
      {isAdmin && onOpenAdminHub && (
        <button
          onClick={() => {
            triggerHaptic("medium");
            onOpenAdminHub();
          }}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold text-xs transition-colors cursor-pointer"
          title="Quản trị học kỳ chính thức"
        >
          <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">Quản trị</span>
        </button>
      )}

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        title="Làm mới sổ điểm"
        aria-label="Làm mới sổ điểm"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-900 dark:text-white" : ""}`} />
      </button>
    </div>
  );
};

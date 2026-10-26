"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, LogOut, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { clearAuthToken } from "@/lib/api/client";

interface HeaderProps {
  user: {
    fullName: string;
    username: string;
    faculty?: string | null;
    className?: string | null;
    role?: "user" | "admin";
  } | null;
  semesters: Array<{ id: string; name: string; isCurrent: boolean }>;
  currentSemesterId: string;
  onSelectSemester: (id: string) => void;
  onOpenNewSemesterModal?: () => void;
}

function getInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "SV";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Header: React.FC<HeaderProps> = ({
  user,
  semesters,
  currentSemesterId,
  onSelectSemester,
  onOpenNewSemesterModal,
}) => {
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    try {
      clearAuthToken();
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2.5 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
            <GraduationCap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-tight text-slate-900">
              HUIT<span className="text-amber-600">.DRL</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline-block">
              QĐ 3385
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (Visible on large screens >= 1024px to prevent tablet header collision) */}
        <nav className="hidden lg:flex items-center space-x-1">
          <Link
            href="/"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Tổng quan
          </Link>
          <Link
            href="/records"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Sổ điểm
          </Link>
          <Link
            href="/goals"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Mục tiêu
          </Link>
          <Link
            href="/handbook"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Sổ tay quy chế
          </Link>
          <Link
            href="/report"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Phiếu ĐRL
          </Link>
          <Link
            href="/profile"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center space-x-1"
          >
            <span>Hồ sơ</span>
          </Link>
        </nav>

        {/* Semester selector & user profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0 min-w-0">
          {semesters.length > 0 && (
            <div className="relative max-w-[130px] xs:max-w-[150px] sm:max-w-[190px] md:max-w-[220px]">
              <select
                value={currentSemesterId}
                onChange={(e) => {
                  if (e.target.value === "__NEW__" && onOpenNewSemesterModal) {
                    onOpenNewSemesterModal();
                  } else {
                    onSelectSemester(e.target.value);
                  }
                }}
                title={semesters.find((s) => s.id === currentSemesterId)?.name || "Chọn học kỳ"}
                className="appearance-none w-full max-w-[130px] xs:max-w-[150px] sm:max-w-[190px] md:max-w-[220px] truncate bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1.5 sm:py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 cursor-pointer transition-colors shadow-2xs"
                aria-label="Chọn học kỳ rèn luyện"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                {isAdmin && onOpenNewSemesterModal && (
                  <option value="__NEW__">+ Tạo học kỳ mới (Admin)...</option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {user && (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
              <Link
                href="/profile"
                title="Xem & chỉnh sửa trang cá nhân"
                className="flex items-center space-x-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-indigo-400 transition-all">
                  {getInitials(user?.fullName)}
                </div>
                <div className="text-left hidden md:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[110px] lg:max-w-[150px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {user.fullName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isAdmin
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {isAdmin ? "Admin" : "Sinh viên"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                    @{user.username}
                  </div>
                </div>
              </Link>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

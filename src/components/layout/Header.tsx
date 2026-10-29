"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, LogOut, ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
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
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  const navLinks = [
    { href: "/", label: "Tổng quan" },
    { href: "/records", label: "Sổ điểm" },
    { href: "/calendar", label: "Lịch trình" },
    { href: "/goals", label: "Mục tiêu" },
    { href: "/handbook", label: "Sổ tay" },
    { href: "/report", label: "Phiếu ĐRL" },
    { href: "/profile", label: "Hồ sơ" },
    ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
  ];

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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center space-x-2.5 hover:opacity-90 transition-opacity shrink-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-amber-500 flex items-center justify-center text-white dark:text-slate-950 shadow-xs">
            <GraduationCap className="w-4 h-4 text-amber-400 dark:text-slate-950" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              HUIT<span className="text-amber-600 dark:text-amber-400">.DRL</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
              QĐ 3385
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links (Clean, single-line, non-wrapping) */}
        <nav className="hidden lg:flex items-center space-x-1 shrink-0">
          {navLinks.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-8 px-3 inline-flex items-center justify-center rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Semester selector & user profile controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
          {/* Semester Selector */}
          {semesters.length > 0 && (
            <div className="relative w-auto max-w-[140px] xs:max-w-[160px] sm:max-w-[185px] lg:max-w-[200px] shrink-0">
              <select
                value={currentSemesterId}
                onChange={(e) => onSelectSemester(e.target.value)}
                title={semesters.find((s) => s.id === currentSemesterId)?.name || "Chọn học kỳ"}
                className="appearance-none h-8 w-full truncate bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-xl pl-2.5 pr-7 py-0 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 cursor-pointer transition-colors shadow-2xs"
                aria-label="Chọn học kỳ rèn luyện"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* User profile & quick action icons */}
          {user && (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
              <Link
                href="/profile"
                title={`Hồ sơ: ${user.fullName} (@${user.username})`}
                className="flex items-center space-x-2 p-0.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-indigo-400 transition-all shadow-2xs">
                  {getInitials(user?.fullName)}
                </div>
                <div className="text-left hidden xl:block max-w-[130px] 2xl:max-w-[160px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {user.fullName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap shrink-0 ${
                        isAdmin
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {isAdmin ? "Admin" : "Sinh viên"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    @{user.username}
                  </div>
                </div>
              </Link>

              <ThemeToggle />

              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

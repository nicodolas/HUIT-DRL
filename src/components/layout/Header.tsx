"use client";

import React from "react";
import { GraduationCap, LogOut, ChevronDown, Award } from "lucide-react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  user: {
    fullName: string;
    mssv?: string | null;
    faculty?: string | null;
  } | null;
  semesters: Array<{ id: string; name: string; isCurrent: boolean }>;
  currentSemesterId: string;
  onSelectSemester: (id: string) => void;
  onOpenNewSemesterModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  semesters,
  currentSemesterId,
  onSelectSemester,
  onOpenNewSemesterModal,
}) => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-huit-blue-700 to-huit-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/10">
            <GraduationCap className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight text-huit-blue-800">
                HUIT<span className="text-huit-orange-600">.DRL</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-huit-orange-700 border border-orange-200">
                QĐ 3385
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Sổ điểm rèn luyện cá nhân sinh viên
            </p>
          </div>
        </div>

        {/* Semester selector & user action */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {semesters.length > 0 && (
            <div className="relative">
              <select
                value={currentSemesterId}
                onChange={(e) => {
                  if (e.target.value === "__NEW__") {
                    onOpenNewSemesterModal();
                  } else {
                    onSelectSemester(e.target.value);
                  }
                }}
                className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl pl-3 pr-8 py-2 border border-slate-300/80 focus:outline-none focus:ring-2 focus:ring-huit-blue-600 cursor-pointer transition-colors"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__NEW__">+ Thêm học kỳ mới...</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                  {user.fullName}
                </div>
                <div className="text-[11px] text-slate-500">
                  {user.mssv || "Sinh viên"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Semester } from "@/lib/db/schema";
import { User, Shield, AlertTriangle, LogOut, FileText, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [discipline, setDiscipline] = useState<string>("none");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          loadSemesters();
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const loadSemesters = async () => {
    try {
      const res = await fetch("/api/semesters");
      const data = await res.json();
      if (data.semesters && data.semesters.length > 0) {
        setSemesters(data.semesters);
        const current = data.semesters.find((s: Semester) => s.isCurrent) || data.semesters[0];
        setCurrentSemesterId(current.id);
        setCurrentSemester(current);
        setDiscipline(current.disciplineLevel || "none");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDiscipline = async (val: string) => {
    setDiscipline(val);
    if (!currentSemesterId) return;
    try {
      await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentSemesterId, disciplineLevel: val }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-100/60 text-slate-800">
      <Header
        user={user}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
        onOpenNewSemesterModal={() => {}}
      />

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        <h1 className="text-xl font-extrabold text-slate-800">
          Hồ sơ sinh viên & Cài đặt
        </h1>

        {/* Student Profile Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-huit-blue-50 text-huit-blue-700 flex items-center justify-center font-black text-xl">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{user.fullName}</h2>
              <p className="text-xs text-slate-500">
                MSSV: {user.mssv || "Chưa cập nhật"} • {user.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 block mb-0.5">Khoa:</span>
              <span className="font-bold text-slate-700">{user.faculty || "Khoa CNTT"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 block mb-0.5">Lớp sinh hoạt:</span>
              <span className="font-bold text-slate-700">{user.className || "12DHTH01"}</span>
            </div>
          </div>
        </div>

        {/* Discipline Setting Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
            <Shield className="w-4 h-4 text-huit-blue-600" />
            <span>Tình trạng kỷ luật trong học kỳ hiện tại</span>
          </div>
          <p className="text-xs text-slate-500">
            Theo Điều 7.2 QĐ 3385: Bị khiển trách xếp loại tối đa Khá; Cảnh cáo xếp loại tối đa Trung bình.
          </p>

          <div className="space-y-2 pt-1">
            {[
              { id: "none", label: "Không bị kỷ luật (Bình thường)" },
              { id: "khien_trach", label: "Bị khiển trách (Trần xếp loại: Khá)" },
              { id: "canh_cao", label: "Bị cảnh cáo (Trần xếp loại: Trung bình)" },
              { id: "dinh_chi", label: "Bị đình chỉ học tập (Không đánh giá ĐRL)" },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center space-x-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  discipline === opt.id
                    ? "border-huit-blue-600 bg-blue-50/60 font-bold text-slate-800"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="discipline"
                  value={opt.id}
                  checked={discipline === opt.id}
                  onChange={(e) => handleUpdateDiscipline(e.target.value)}
                  className="text-huit-blue-600 focus:ring-huit-blue-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {savedSuccess && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 mt-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã lưu trạng thái kỷ luật học kỳ</span>
            </div>
          )}
        </div>

        {/* Legal Document Info */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 text-xs space-y-2">
          <div className="flex items-center space-x-1.5 font-bold text-slate-700">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Văn bản pháp lý áp dụng</span>
          </div>
          <p className="text-slate-500 leading-relaxed text-[11px]">
            Hệ thống áp dụng Quy định về việc đánh giá rèn luyện của sinh viên ban hành theo <strong>Quyết định số 3385/QĐ-DCT</strong> ngày 12 tháng 8 năm 2026 của Hiệu trưởng Trường Đại học Công Thương TP. Hồ Chí Minh.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200/80 font-bold text-xs hover:bg-rose-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
}

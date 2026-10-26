"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { Semester } from "@/lib/db/schema";
import { clearAuthToken } from "@/lib/api/client";
import {
  User,
  Shield,
  LogOut,
  FileText,
  CheckCircle2,
  Edit3,
  Lock,
  KeyRound,
  Trash2,
  Calendar,
  ExternalLink,
  Download,
  Upload,
  Database,
} from "lucide-react";

function getInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "SV";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [discipline, setDiscipline] = useState<string>("none");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);

  // Backup & Restore states
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editFaculty, setEditFaculty] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          setEditFullName(data.user.fullName || "");
          setEditStudentId(data.user.studentId || "");
          setEditFaculty(data.user.faculty || "Công nghệ Thông tin");
          setEditClassName(data.user.className || "");
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    setEditMessage(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          studentId: editStudentId,
          faculty: editFaculty,
          className: editClassName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setIsEditing(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setEditMessage(data.error || "Lỗi lưu thông tin");
      }
    } catch (e: any) {
      setEditMessage(e.message || "Lỗi lưu thông tin");
    } finally {
      setEditSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi đổi mật khẩu");
      }
      setPasswordSuccess("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess(null);
      }, 2500);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteSemester = async (semId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa học kỳ này? Mọi bản ghi điểm trong học kỳ sẽ bị xóa vĩnh viễn.")) {
      return;
    }

    try {
      const res = await fetch(`/api/semesters?id=${semId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi xóa học kỳ");
        return;
      }
      await loadSemesters();
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    }
  };

  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch("/api/backup");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `huit-drl-backup-${user?.username || "student"}-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg("Đã xuất file sao lưu JSON thành công!");
      setTimeout(() => setBackupMsg(null), 3500);
    } catch (e: any) {
      alert("Lỗi xuất sao lưu: " + e.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBackupLoading(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBackupMsg(data.message || "Khôi phục dữ liệu thành công!");
      await loadSemesters();
      setTimeout(() => setBackupMsg(null), 3500);
    } catch (e: any) {
      alert("Lỗi khôi phục: " + e.message);
    } finally {
      setBackupLoading(false);
      e.target.value = "";
    }
  };

  const handleLogout = async () => {
    clearAuthToken();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-50 text-slate-900">
      <Header
        user={user}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
        onOpenNewSemesterModal={() => setNewSemesterModalOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Tài khoản cá nhân & Thiết lập
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý thông tin hồ sơ sinh viên, an toàn tài khoản và học kỳ rèn luyện
            </p>
          </div>

          <Link
            href={`/report?semesterId=${currentSemesterId}`}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors self-start sm:self-auto cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Xem phiếu tự chấm QĐ 3385</span>
          </Link>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): User Info & Security */}
          <div className="lg:col-span-5 space-y-6">
            {/* User Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm ring-4 ring-slate-100 shrink-0">
                    {getInitials(user.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                      <h2 className="text-base font-bold text-slate-900 truncate">{user.fullName}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.role === "admin"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {user.role === "admin" ? "Quản trị viên" : "Sinh viên HUIT"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono mt-1 flex-wrap">
                      <span>@{user.username}</span>
                      {user.studentId && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                            MSSV: {user.studentId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!isEditing && user) {
                      setEditFullName(user.fullName || "");
                      setEditStudentId(user.studentId || "");
                      setEditFaculty(user.faculty || "Công nghệ Thông tin");
                      setEditClassName(user.className || "");
                      setEditMessage(null);
                    }
                    setIsEditing(!isEditing);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Đóng" : "Chỉnh sửa hồ sơ"}</span>
                </button>
              </div>

              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Cập nhật thông tin hồ sơ thành công!</span>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="pt-3 border-t border-slate-100 space-y-3.5">
                  {editMessage && (
                    <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
                      {editMessage}
                    </div>
                  )}

                  {/* Immutable Username field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tên đăng nhập:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Định danh bất biến</span>
                    </div>
                    <input
                      type="text"
                      value={`@${user.username}`}
                      disabled
                      readOnly
                      className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Full Name field */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Họ và tên sinh viên: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      required
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                    />
                  </div>

                  {/* Student ID (MSSV) field - optional */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Mã số sinh viên (MSSV): <span className="text-slate-400 font-normal">(tùy chọn)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Tự điền vào Phiếu Mẫu 01</span>
                    </div>
                    <input
                      type="text"
                      value={editStudentId}
                      onChange={(e) => setEditStudentId(e.target.value)}
                      placeholder="Ví dụ: 2001210123"
                      maxLength={32}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Khi nhập sẽ tự động hiển thị trên Phiếu tự đánh giá Mẫu 01 (QĐ 3385) và kho minh chứng.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Faculty field */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Khoa đào tạo:
                      </label>
                      <select
                        value={editFaculty}
                        onChange={(e) => setEditFaculty(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 cursor-pointer"
                      >
                        <option value="Công nghệ Thông tin">Khoa Công nghệ Thông tin</option>
                        <option value="Công nghệ Thực phẩm">Khoa Công nghệ Thực phẩm</option>
                        <option value="Quản trị Kinh doanh">Khoa Quản trị Kinh doanh</option>
                        <option value="Tài chính - Ngân hàng">Khoa Tài chính - Ngân hàng</option>
                        <option value="Điện - Điện tử">Khoa Điện - Điện tử</option>
                        <option value="Công nghệ Cơ khí">Khoa Công nghệ Cơ khí</option>
                        <option value="Ngoại ngữ">Khoa Ngoại ngữ</option>
                        <option value="Luật">Khoa Luật</option>
                        <option value="Khoa học Ứng dụng">Khoa Khoa học Ứng dụng</option>
                        <option value="Công nghệ May & Thời trang">Khoa Công nghệ May & Thời trang</option>
                        <option value="Thương mại Điện tử">Bộ môn Thương mại Điện tử</option>
                        <option value="Khác">Khoa khác</option>
                      </select>
                    </div>

                    {/* Class field */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Lớp sinh hoạt:
                      </label>
                      <input
                        type="text"
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                        placeholder="Ví dụ: 13DHTH03"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 uppercase"
                      />
                    </div>
                  </div>

                  {/* Security notice regarding role */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Vai trò hiện tại: <strong className="text-slate-700">{user.role === "admin" ? "Quản trị viên" : "Sinh viên"}</strong></span>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Mã số sinh viên (MSSV):</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {user.studentId || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Lớp sinh hoạt:</span>
                    <span className="font-semibold text-slate-900">
                      {user.className || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 sm:col-span-2">
                    <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Khoa quản lý chuyên môn:</span>
                    <span className="font-semibold text-slate-900">
                      {user.faculty || "Khoa Công nghệ Thông tin"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Account Security & Password Change Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-sm">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-none">Bảo mật & Mật khẩu</span>
                    <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">Tài khoản bảo vệ mật khẩu nội bộ</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  {showPasswordChange ? "Đóng" : "Đổi mật khẩu"}
                </button>
              </div>

              {showPasswordChange && (
                <form onSubmit={handleChangePassword} className="pt-3 border-t border-slate-100 space-y-3">
                  {passwordError && (
                    <div className="p-2.5 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="p-2.5 text-xs bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Mật khẩu hiện tại:
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Mật khẩu mới (tối thiểu 6 ký tự):
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mật khẩu mới"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Xác nhận mật khẩu mới:
                      </label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {passwordSaving ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Document Reference Info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-800">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Căn cứ pháp lý áp dụng</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Hệ thống đánh giá và tính điểm rèn luyện tự động tuân thủ <strong>Quyết định số 3385/QĐ-DCT</strong> ban hành ngày 12/08/2026 của Hiệu trưởng Trường Đại học Công Thương TP. Hồ Chí Minh.
              </p>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-2xl bg-white text-rose-600 border border-rose-200 hover:bg-rose-50/70 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>

          {/* Right Column (7 cols): Semesters, Discipline, Backup */}
          <div className="lg:col-span-7 space-y-6">
            {/* Semesters Management Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-sm">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-none">Học kỳ rèn luyện ({semesters.length})</span>
                    <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">Chọn học kỳ để theo dõi và ghi nhận</span>
                  </div>
                </div>

                {/* ONLY show + Thêm học kỳ button if user is Admin */}
                {user.role === "admin" && (
                  <button
                    onClick={() => setNewSemesterModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-2xs flex items-center space-x-1"
                  >
                    <span>+ Thêm học kỳ (Admin)</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5 pt-1">
                {semesters.map((s) => {
                  const isSelected = s.id === currentSemesterId;
                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs"
                          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isSelected ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-300"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                            <span className="font-bold text-slate-900 truncate">{s.name}</span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Đang áp dụng
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Mục tiêu cá nhân: <strong className="text-slate-700">{s.targetScore}đ</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {!isSelected && (
                          <button
                            onClick={() => setCurrentSemesterId(s.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                          >
                            Chọn
                          </button>
                        )}
                        {/* ONLY show Trash button if user is Admin */}
                        {user.role === "admin" && semesters.length > 1 && (
                          <button
                            onClick={() => handleDeleteSemester(s.id)}
                            title="Xóa học kỳ này (Quyền Quản trị viên)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discipline Setting Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="block leading-none">Tình trạng kỷ luật (QĐ 3385)</span>
                  <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">Xác định trần xếp loại rèn luyện học kỳ hiện tại</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Quy định tại <strong>Điều 7.2 QĐ 3385/QĐ-DCT</strong>: Khiển trách trần xếp loại là <strong>Khá</strong>; cảnh cáo trần xếp loại là <strong>Trung bình</strong>; đình chỉ học tập không được đánh giá ĐRL.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {[
                  { id: "none", label: "Không bị kỷ luật", desc: "Bình thường" },
                  { id: "khien_trach", label: "Bị khiển trách", desc: "Trần xếp loại: Khá" },
                  { id: "canh_cao", label: "Bị cảnh cáo", desc: "Trần xếp loại: Trung bình" },
                  { id: "dinh_chi", label: "Bị đình chỉ", desc: "Không đánh giá ĐRL" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start space-x-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      discipline === opt.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                        : "border-slate-200/90 hover:bg-slate-50 text-slate-700 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="discipline"
                      value={opt.id}
                      checked={discipline === opt.id}
                      onChange={(e) => handleUpdateDiscipline(e.target.value)}
                      className="mt-0.5 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold ${discipline === opt.id ? "text-white" : "text-slate-900"}`}>
                        {opt.label}
                      </div>
                      <div className={`text-[11px] ${discipline === opt.id ? "text-slate-300" : "text-slate-500"}`}>
                        {opt.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {savedSuccess && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mt-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã lưu trạng thái kỷ luật học kỳ thành công</span>
                </div>
              )}
            </div>

            {/* Backup & Restore Data Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="block leading-none">Sao lưu & Khôi phục dữ liệu</span>
                  <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">Xuất/nhập toàn bộ lịch sử điểm và minh chứng</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Xuất dữ liệu học kỳ và toàn bộ minh chứng rèn luyện ra file JSON chuẩn để lưu trữ an toàn hoặc chuyển đổi thiết bị.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={handleExportBackup}
                  disabled={backupLoading}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>{backupLoading ? "Đang xử lý..." : "Xuất file sao lưu (JSON)"}</span>
                </button>

                <label className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khôi phục từ file JSON</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackup}
                    disabled={backupLoading}
                    className="hidden"
                  />
                </label>
              </div>

              {backupMsg && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{backupMsg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <NewSemesterModal
        isOpen={newSemesterModalOpen}
        onClose={() => setNewSemesterModalOpen(false)}
        onCreated={async (newSem) => {
          await loadSemesters();
          if (newSem?.id) setCurrentSemesterId(newSem.id);
        }}
      />

      <BottomNav />
    </div>
  );
}

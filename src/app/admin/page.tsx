"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Calendar,
  FileCheck2,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertTriangle,
  Building,
  UserCheck,
  GraduationCap,
  Eye,
  X,
} from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  studentId: string | null;
  faculty: string | null;
  className: string | null;
  role: "user" | "admin";
  createdAt: string;
  totalRecords: number;
  totalSemesters: number;
}

interface AdminSemester {
  id: string;
  name: string;
  isCurrent: boolean;
  isSystem: boolean;
  targetScore: number;
  disciplineLevel: string;
  submissionDeadline: string | null;
  status: string;
  createdAt: string;
  creatorUsername: string | null;
  creatorFullName: string | null;
  recordCount: number;
}

interface AdminEvidenceRecord {
  id: string;
  category: number;
  title: string;
  type: string;
  points: string | number;
  quantity: number;
  occurredAt: string | null;
  note: string | null;
  evidenceUrl: string | null;
  auditStatus: "pending_review" | "valid" | "rejected" | "missing";
  auditComment: string | null;
  createdAt: string;
  userId: string;
  studentName: string;
  studentId: string | null;
  studentClass: string | null;
  studentFaculty: string | null;
  semesterId: string;
  semesterName: string;
}

interface StatsData {
  users: { totalUsers: number; totalStudents: number; totalAdmins: number };
  semesters: { totalSemesters: number; totalSystemSemesters: number };
  records: {
    totalRecords: number;
    totalEvidence: number;
    evidencePending: number;
    evidenceValid: number;
    evidenceRejected: number;
  };
  facultyDistribution: Array<{ faculty: string; count: number }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [semestersList, setSemestersList] = useState<any[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "semesters" | "evidence">("overview");

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Users management state
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFacultyFilter, setUserFacultyFilter] = useState("ALL");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userLoading, setUserLoading] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Semesters state
  const [adminSemesters, setAdminSemesters] = useState<AdminSemester[]>([]);
  const [semesterLoading, setSemesterLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSemName, setNewSemName] = useState("");
  const [newSemTarget, setNewSemTarget] = useState(90);
  const [newSemDeadline, setNewSemDeadline] = useState("");
  const [newSemIsSystem, setNewSemIsSystem] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [semesterActionMsg, setSemesterActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Evidence state
  const [evidenceList, setEvidenceList] = useState<AdminEvidenceRecord[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState("all");
  const [evidenceCategoryFilter, setEvidenceCategoryFilter] = useState(0);
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [previewEvidenceUrl, setPreviewEvidenceUrl] = useState<string | null>(null);
  const [auditCommentModal, setAuditCommentModal] = useState<{
    recordId: string;
    targetStatus: "valid" | "rejected";
    comment: string;
  } | null>(null);

  // Initial Auth & Access Check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam && ["overview", "users", "semesters", "evidence"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.user) {
          router.push("/login");
          return;
        }
        if (data.user.role !== "admin") {
          router.push("/");
          return;
        }
        setCurrentUser(data.user);
        loadHeaderSemesters();
        fetchStats();
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const loadHeaderSemesters = async () => {
    try {
      const res = await fetch("/api/semesters");
      const data = await res.json();
      if (data.semesters && data.semesters.length > 0) {
        setSemestersList(data.semesters);
        const curr = data.semesters.find((s: any) => s.isCurrent) || data.semesters[0];
        setCurrentSemesterId(curr.id);
      }
    } catch (e) {
      console.error("Load semesters error:", e);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Fetch stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set("q", userSearch);
      if (userFacultyFilter !== "ALL") params.set("faculty", userFacultyFilter);
      if (userRoleFilter !== "ALL") params.set("role", userRoleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUserList(data.users || []);
      }
    } catch (e) {
      console.error("Fetch users error:", e);
    } finally {
      setUserLoading(false);
    }
  }, [userSearch, userFacultyFilter, userRoleFilter]);

  const fetchSemesters = useCallback(async () => {
    setSemesterLoading(true);
    try {
      const res = await fetch("/api/admin/semesters");
      if (res.ok) {
        const data = await res.json();
        setAdminSemesters(data.semesters || []);
      }
    } catch (e) {
      console.error("Fetch semesters error:", e);
    } finally {
      setSemesterLoading(false);
    }
  }, []);

  const fetchEvidence = useCallback(async () => {
    setEvidenceLoading(true);
    try {
      const params = new URLSearchParams();
      if (evidenceStatusFilter !== "all") params.set("status", evidenceStatusFilter);
      if (evidenceCategoryFilter > 0) params.set("category", evidenceCategoryFilter.toString());
      if (evidenceSearch) params.set("q", evidenceSearch);

      const res = await fetch(`/api/admin/evidence?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvidenceList(data.records || []);
      }
    } catch (e) {
      console.error("Fetch evidence error:", e);
    } finally {
      setEvidenceLoading(false);
    }
  }, [evidenceStatusFilter, evidenceCategoryFilter, evidenceSearch]);

  // Tab change trigger
  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "semesters") fetchSemesters();
    if (activeTab === "evidence") fetchEvidence();
  }, [activeTab, fetchUsers, fetchSemesters, fetchEvidence]);

  // Actions
  const handleToggleUserRole = async (targetUser: AdminUser) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    const confirmText =
      newRole === "admin"
        ? `Bạn có chắc muốn thăng quyền Quản trị viên (Admin) cho "${targetUser.fullName}" (@${targetUser.username})?`
        : `Bạn có chắc muốn chuyển "${targetUser.fullName}" về quyền Sinh viên thông thường?`;

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMsg({ type: "success", text: data.message });
        fetchUsers();
        fetchStats();
      } else {
        setUserActionMsg({ type: "error", text: data.error || "Cập nhật thất bại" });
      }
    } catch {
      setUserActionMsg({ type: "error", text: "Lỗi kết nối máy chủ" });
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemName.trim()) return;

    setCreateSubmitting(true);
    setSemesterActionMsg(null);
    try {
      const res = await fetch("/api/admin/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSemName.trim(),
          targetScore: Number(newSemTarget),
          submissionDeadline: newSemDeadline || null,
          isSystem: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateModalOpen(false);
        setNewSemName("");
        setSemesterActionMsg({ type: "success", text: `Đã tạo thành công học kỳ hệ thống "${newSemName}"!` });
        fetchSemesters();
        fetchStats();
        loadHeaderSemesters();
      } else {
        setSemesterActionMsg({ type: "error", text: data.error || "Tạo học kỳ thất bại" });
      }
    } catch {
      setSemesterActionMsg({ type: "error", text: "Lỗi kết nối khi tạo học kỳ" });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeleteSemester = async (sem: AdminSemester) => {
    if (!window.confirm(`XÁC NHẬN XÓA HỌC KỲ: "${sem.name}"?\nThao tác này sẽ xóa vĩnh viễn học kỳ và tất cả dữ liệu rèn luyện liên kết của sinh viên.`)) {
      return;
    }

    setSemesterActionMsg(null);
    try {
      const res = await fetch(`/api/admin/semesters?id=${sem.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        await fetchSemesters();
        fetchStats();
        await loadHeaderSemesters();
        setSemesterActionMsg({ type: "success", text: data.message || `Đã xóa học kỳ "${sem.name}" thành công!` });
      } else {
        setSemesterActionMsg({ type: "error", text: data.error || "Không thể xóa học kỳ" });
      }
    } catch {
      setSemesterActionMsg({ type: "error", text: "Lỗi kết nối khi xóa" });
    }
  };

  const handleAuditAction = async (recordId: string, status: "valid" | "rejected", comment?: string) => {
    try {
      const res = await fetch("/api/admin/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          auditStatus: status,
          auditComment: comment || null,
        }),
      });
      if (res.ok) {
        setAuditCommentModal(null);
        fetchEvidence();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || "Thao tác thất bại");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Đang tải Cổng Quản trị...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        user={currentUser}
        semesters={semestersList}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Admin Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Cổng Quản Trị Hệ Thống HUIT.DRL
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Quản lý tập trung toàn bộ dữ liệu sinh viên, học kỳ hệ thống và kiểm duyệt hồ sơ minh chứng điểm rèn luyện tuân thủ Quy chế 3385/QĐ-DCT.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start md:self-auto">
              <button
                onClick={() => {
                  fetchStats();
                  if (activeTab === "users") fetchUsers();
                  if (activeTab === "semesters") fetchSemesters();
                  if (activeTab === "evidence") fetchEvidence();
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "overview"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Tổng quan hệ thống</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "users"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Quản lý Sinh viên & Quyền ({stats?.users.totalUsers ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("semesters")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "semesters"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Quản lý Học kỳ ({stats?.semesters.totalSemesters ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("evidence")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "evidence"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Kiểm duyệt Minh chứng</span>
              {(stats?.records.evidencePending ?? 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
                  {stats?.records.evidencePending}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">Tổng số Sinh viên</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {stats.users.totalStudents}
                </div>
                <p className="text-[11px] text-slate-400">
                  Đã đăng ký tài khoản hồ sơ cá nhân
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">Minh chứng chờ duyệt</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                  {stats.records.evidencePending}
                </div>
                <p className="text-[11px] text-slate-400">
                  Trên tổng số {stats.records.totalEvidence} ảnh/file đã tải lên
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">Minh chứng Hợp lệ</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {stats.records.evidenceValid}
                </div>
                <p className="text-[11px] text-slate-400">
                  Đã được cán bộ/admin phê duyệt chuẩn
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">Tổng số Học kỳ</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {stats.semesters.totalSemesters}
                </div>
                <p className="text-[11px] text-slate-400">
                  {stats.semesters.totalSystemSemesters} học kỳ hệ thống chính thức
                </p>
              </div>
            </div>

            {/* Quick Audit Action Banner */}
            {stats.records.evidencePending > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                      Có {stats.records.evidencePending} minh chứng rèn luyện đang chờ thẩm định
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Sinh viên đã gửi minh chứng ảnh và phiếu hoạt động. Hãy kiểm tra và xác thực để hoàn tất bảng điểm.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("evidence");
                    setEvidenceStatusFilter("pending_review");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Kiểm duyệt ngay &rarr;
                </button>
              </div>
            )}

            {/* Faculty Distribution Table & Progress Bars */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
                <Building className="w-4 h-4 text-indigo-500" />
                <span>Phân bổ sinh viên theo Khoa đào tạo</span>
              </div>

              <div className="space-y-3">
                {stats.facultyDistribution.map((item) => {
                  const percentage = stats.users.totalUsers > 0
                    ? Math.round((item.count / stats.users.totalUsers) * 100)
                    : 0;

                  return (
                    <div key={item.faculty} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.faculty}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono">
                          {item.count} sinh viên ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: USERS & PERMISSIONS */}
        {/* ========================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tìm theo tên, MSSV, @username, lớp..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <select
                    value={userFacultyFilter}
                    onChange={(e) => setUserFacultyFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Tất cả Khoa đào tạo</option>
                    <option value="Công nghệ Thông tin">Công nghệ Thông tin</option>
                    <option value="Công nghệ Thực phẩm">Công nghệ Thực phẩm</option>
                    <option value="Quản trị Kinh doanh">Quản trị Kinh doanh</option>
                    <option value="Tài chính - Ngân hàng">Tài chính - Ngân hàng</option>
                    <option value="Điện - Điện tử">Điện - Điện tử</option>
                    <option value="Ngoại ngữ">Ngoại ngữ</option>
                    <option value="Luật">Luật</option>
                  </select>
                </div>

                <div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Tất cả vai trò</option>
                    <option value="user">Sinh viên thông thường</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              {userActionMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                    userActionMsg.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  <span>{userActionMsg.text}</span>
                  <button onClick={() => setUserActionMsg(null)} className="cursor-pointer text-xs font-bold ml-2">✕</button>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Họ và tên</th>
                      <th className="px-4 py-3">MSSV / Lớp</th>
                      <th className="px-4 py-3">Khoa đào tạo</th>
                      <th className="px-4 py-3 text-center">Số mục ĐRL</th>
                      <th className="px-4 py-3 text-center">Vai trò</th>
                      <th className="px-4 py-3 text-right">Thao tác quyền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {userLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-amber-500" />
                          Đang tải danh sách sinh viên...
                        </td>
                      </tr>
                    ) : userList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Không tìm thấy tài khoản nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      userList.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 dark:text-white">{u.fullName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {u.studentId || "Chưa có MSSV"}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.className || "Chưa có lớp"}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {u.faculty || "Chưa phân khoa"}
                            </td>
                            <td className="px-4 py-3 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
                              {u.totalRecords}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.role === "admin"
                                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {u.role === "admin" ? "Quản trị viên" : "Sinh viên"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isSelf ? (
                                <span className="text-[11px] text-slate-400 italic">Tài khoản của bạn</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserRole(u)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                    u.role === "admin"
                                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                                      : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                                  }`}
                                >
                                  {u.role === "admin" ? "Hạ quyền SV" : "Cấp Admin"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SYSTEM SEMESTERS */}
        {/* ========================================================================= */}
        {activeTab === "semesters" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Danh sách học kỳ trong toàn bộ hệ thống
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Học kỳ hệ thống (isSystem = true) sẽ tự động đồng bộ hóa cho mọi sinh viên khi họ đăng nhập.
                </p>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo học kỳ hệ thống</span>
              </button>
            </div>

            {semesterActionMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-2xs ${
                  semesterActionMsg.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
                }`}
              >
                <span>{semesterActionMsg.text}</span>
                <button
                  onClick={() => setSemesterActionMsg(null)}
                  className="cursor-pointer text-xs font-bold ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Tên học kỳ</th>
                      <th className="px-4 py-3">Loại học kỳ</th>
                      <th className="px-4 py-3">Người khởi tạo</th>
                      <th className="px-4 py-3 text-center">Mục tiêu chuẩn</th>
                      <th className="px-4 py-3 text-center">Số bản ghi ĐRL</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {semesterLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-amber-500" />
                          Đang tải danh sách học kỳ...
                        </td>
                      </tr>
                    ) : adminSemesters.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Chưa có học kỳ nào
                        </td>
                      </tr>
                    ) : (
                      adminSemesters.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {s.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.isSystem
                                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {s.isSystem ? "Chính thức (Hệ thống)" : "Cá nhân sinh viên"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {s.creatorFullName ? (
                              <span>
                                {s.creatorFullName} <span className="text-slate-400">(@{s.creatorUsername})</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Mặc định hệ thống</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
                            {s.targetScore}đ
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
                            {s.recordCount}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteSemester(s)}
                              title="Xóa học kỳ này"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EVIDENCE AUDIT */}
        {/* ========================================================================= */}
        {activeTab === "evidence" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={evidenceSearch}
                    onChange={(e) => setEvidenceSearch(e.target.value)}
                    placeholder="Tìm theo tên SV, MSSV, tên hoạt động..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <select
                    value={evidenceStatusFilter}
                    onChange={(e) => setEvidenceStatusFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Tất cả trạng thái thẩm định</option>
                    <option value="pending_review">Chờ thẩm định (Pending)</option>
                    <option value="valid">Đã duyệt hợp lệ (Valid)</option>
                    <option value="rejected">Bị từ chối (Rejected)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={evidenceCategoryFilter}
                    onChange={(e) => setEvidenceCategoryFilter(Number(e.target.value))}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value={0}>Tất cả Tiêu chí (1-5)</option>
                    <option value={1}>Tiêu chí 1: Ý thức học tập</option>
                    <option value={2}>Tiêu chí 2: Nội quy, quy chế</option>
                    <option value={3}>Tiêu chí 3: Hoạt động chính trị, XH, VH-VN</option>
                    <option value={4}>Tiêu chí 4: Phẩm chất công dân & cộng đồng</option>
                    <option value={5}>Tiêu chí 5: Phụ trách lớp, đoàn thể</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Evidence Cards */}
            <div className="space-y-3">
              {evidenceLoading ? (
                <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-amber-500" />
                  Đang tải danh sách minh chứng...
                </div>
              ) : evidenceList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800">
                  Không tìm thấy hồ sơ minh chứng nào phù hợp
                </div>
              ) : (
                evidenceList.map((rec) => {
                  return (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Tiêu chí {rec.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {rec.semesterName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rec.auditStatus === "valid"
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                : rec.auditStatus === "rejected"
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                                : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {rec.auditStatus === "valid"
                              ? "Hợp lệ"
                              : rec.auditStatus === "rejected"
                              ? "Từ chối"
                              : "Chờ thẩm định"}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {rec.title}
                          </h4>
                          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>
                              Sinh viên: <strong className="text-slate-700 dark:text-slate-200">{rec.studentName}</strong>
                            </span>
                            <span>•</span>
                            <span className="font-mono">MSSV: {rec.studentId || "Chưa cập nhật"}</span>
                            <span>•</span>
                            <span>Lớp: {rec.studentClass || "Chưa cập nhật"}</span>
                          </div>
                        </div>

                        {rec.note && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Ghi chú của SV:</span> {rec.note}
                          </p>
                        )}

                        {rec.auditComment && (
                          <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-800">
                            <span className="font-semibold">Nhận xét cán bộ:</span> {rec.auditComment}
                          </p>
                        )}
                      </div>

                      {/* Right side actions */}
                      <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                        {rec.evidenceUrl && (
                          <button
                            onClick={() => setPreviewEvidenceUrl(rec.evidenceUrl)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem ảnh</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleAuditAction(rec.id, "valid")}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Duyệt hợp lệ</span>
                        </button>

                        <button
                          onClick={() =>
                            setAuditCommentModal({
                              recordId: rec.id,
                              targetStatus: "rejected",
                              comment: rec.auditComment || "Minh chứng không đủ căn cứ xác thực hoặc thông tin không rõ ràng.",
                            })
                          }
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Từ chối</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* CREATE SEMESTER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>Tạo học kỳ hệ thống mới</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên học kỳ:
                </label>
                <input
                  type="text"
                  required
                  value={newSemName}
                  onChange={(e) => setNewSemName(e.target.value)}
                  placeholder="Ví dụ: Học kỳ 1 (2026 - 2027)"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Điểm mục tiêu rèn luyện mặc định:
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={newSemTarget}
                  onChange={(e) => setNewSemTarget(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Hạn chót nộp hồ sơ tự chấm (tùy chọn):
                </label>
                <input
                  type="date"
                  value={newSemDeadline}
                  onChange={(e) => setNewSemDeadline(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <input
                  type="checkbox"
                  id="isSystem"
                  checked={newSemIsSystem}
                  onChange={(e) => setNewSemIsSystem(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="isSystem" className="text-xs font-medium text-amber-900 dark:text-amber-200 cursor-pointer">
                  Học kỳ chính thức (Tự động đồng bộ đến mọi sinh viên)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {createSubmitting ? "Đang xử lý..." : "Tạo học kỳ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT REJECT COMMENT MODAL */}
      {auditCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <span>Lý do từ chối minh chứng</span>
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhận xét này sẽ hiển thị trực tiếp cho sinh viên để họ biết lý do và bổ sung minh chứng hợp lệ.
            </p>

            <textarea
              rows={3}
              value={auditCommentModal.comment}
              onChange={(e) =>
                setAuditCommentModal({
                  ...auditCommentModal,
                  comment: e.target.value,
                })
              }
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-slate-100"
            />

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setAuditCommentModal(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAuditAction(
                    auditCommentModal.recordId,
                    "rejected",
                    auditCommentModal.comment
                  )
                }
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE IMAGE PREVIEW MODAL */}
      {previewEvidenceUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-3xl max-h-[90vh] w-full flex flex-col items-center">
            <button
              onClick={() => setPreviewEvidenceUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-400 cursor-pointer flex items-center space-x-1 text-xs"
            >
              <X className="w-5 h-5" />
              <span>Đóng</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewEvidenceUrl}
              alt="Minh chứng chi tiết"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}


"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  QrCode as QrIcon,
  Share2,
  Calendar,
  FileQuestion,
  FileDown,
  Layers,
  ListFilter,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Semester, DrlRecord } from "@/lib/db/schema";
import { ScoreCalculationResult } from "@/lib/drl/calculator";
import { CATEGORIES } from "@/lib/drl/rules";
import { QrCodeViewer } from "@/components/common/QrCodeViewer";
import { PreFlightAuditModal } from "@/components/modals/PreFlightAuditModal";
import { AnnualReportModal } from "@/components/dashboard/AnnualReportModal";
import { DrlAppealModal } from "@/components/modals/DrlAppealModal";
import { shareTrainingSummary } from "@/lib/mobile/share";
import { APP_CONFIG } from "@/lib/config/env";
import { APP_FEATURES } from "@/lib/config/features";
import {
  buildDetailedForm01Data,
  createForm01ExportData,
  calculateAuditStats,
} from "@/lib/drl/form01Helper";

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSemesterId = searchParams.get("semesterId");

  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>(requestedSemesterId || "");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [scoreSummary, setScoreSummary] = useState<ScoreCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"official" | "personal">("official");
  const [criteriaView, setCriteriaView] = useState<"summary" | "detailed">("summary");
  const [simulateClassReview, setSimulateClassReview] = useState(false);
  const [classScores, setClassScores] = useState<Record<number, number>>({ 1: 25, 2: 20, 3: 0, 4: 15, 5: 0 });
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [annualReportOpen, setAnnualReportOpen] = useState(false);
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [evidenceFolderUrl, setEvidenceFolderUrl] = useState("");
  const [exportSuccess, setExportSuccess] = useState(false);
  const [auditFilter, setAuditFilter] = useState<"all" | "valid" | "pending_review" | "missing" | "rejected">("all");

  // Initialize evidenceFolderUrl from localStorage or records
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("huit_evidence_url");
      if (saved) {
        setEvidenceFolderUrl(saved);
      }
    }
  }, []);

  // If no saved evidence link, look for one in records
  useEffect(() => {
    if (!evidenceFolderUrl && records.length > 0) {
      const firstWithEvidence = records.find((r) => r.evidenceUrl && r.evidenceUrl.trim().startsWith("http"));
      if (firstWithEvidence?.evidenceUrl) {
        setEvidenceFolderUrl(firstWithEvidence.evidenceUrl);
      }
    }
  }, [records, evidenceFolderUrl]);

  // Load auth
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
        if (!currentSemesterId) {
          const current = data.semesters.find((s: Semester) => s.isCurrent) || data.semesters[0];
          setCurrentSemesterId(current.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRecords = async () => {
    if (!currentSemesterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/records?semesterId=${currentSemesterId}`);
      const data = await res.json();
      if (data && !data.error) {
        setRecords(data.records || []);
        setScoreSummary(data.scoreSummary);
        if (data.scoreSummary?.categories) {
          const initialMap: Record<number, number> = {};
          for (let c = 1; c <= 5; c++) {
            initialMap[c] = data.scoreSummary.categories[c]?.cappedScore || 0;
          }
          setClassScores(initialMap);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [currentSemesterId]);

  const currentSemester = semesters.find((s) => s.id === currentSemesterId) || semesters[0];

  // Detailed Form 01 Groups
  const detailedFormData = useMemo(() => {
    if (!records || !currentSemester) return null;
    return buildDetailedForm01Data(records, (currentSemester.disciplineLevel as any) || "none");
  }, [records, currentSemester]);

  // Audit Stats
  const auditStats = useMemo(() => calculateAuditStats(records), [records]);

  // Handle inline audit status change
  const handleUpdateAuditStatus = async (recordId: string, currentStatus: string) => {
    const cycleMap: Record<string, string> = {
      pending_review: "valid",
      valid: "rejected",
      rejected: "missing",
      missing: "pending_review",
    };
    const nextStatus = cycleMap[currentStatus] || "pending_review";

    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditStatus: nextStatus }),
      });
      if (res.ok) {
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? { ...r, auditStatus: nextStatus } : r))
        );
      }
    } catch (err) {
      console.error("Failed to update audit status:", err);
    }
  };

  // Export Form 01 JSON
  const handleExportForm01Json = () => {
    if (!user || !currentSemester || !scoreSummary) return;

    const exportData = createForm01ExportData(
      {
        fullName: user.fullName,
        username: user.username,
        faculty: user.faculty || undefined,
        className: user.className || undefined,
      },
      currentSemester,
      scoreSummary,
      records,
      classScores,
      evidenceFolderUrl || undefined
    );

    const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute(
      "download",
      `HUIT_DRL_Form01_${user.username}_${currentSemester.name.replace(/\s+/g, "_")}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleShareSummary = async () => {
    if (!scoreSummary) return;
    const catList = [1, 2, 3, 4, 5].map((c) => ({
      category: c,
      shortName: CATEGORIES[c].shortName,
      score: scoreSummary.categories[c]?.cappedScore || 0,
      maxPoints: CATEGORIES[c].maxPoints,
    }));

    const res = await shareTrainingSummary({
      studentName: user.fullName,
      username: user.username,
      className: user.className,
      faculty: user.faculty,
      semesterName: currentSemester?.name || "Học kỳ",
      totalScore: scoreSummary.totalScore,
      ratingLabel: scoreSummary.rating.label,
      categories: catList,
      evidenceUrl: evidenceFolderUrl || null,
    });

    if (res.success) {
      setShareFeedback(res.method === "native" ? "Đã mở bảng chia sẻ!" : "Đã sao chép tin nhắn Zalo!");
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  // Filtered records for Annex table
  const filteredAnnexRecords = useMemo(() => {
    if (auditFilter === "all") return records;
    return records.filter((r) => {
      const st = r.auditStatus || (r.evidenceUrl ? "pending_review" : "missing");
      return st === auditFilter;
    });
  }, [records, auditFilter]);

  if (!user || loading || !scoreSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-2 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Đang tải phiếu đánh giá Form 01...</span>
        </div>
      </div>
    );
  }

  const simulatedTotalClassScore = Math.min(
    100,
    Object.values(classScores).reduce((a, b) => a + b, 0)
  );

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 text-slate-900 print:bg-white print:p-0">
      {/* Top action bar - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="text-xs text-slate-500">
            Phiếu ĐRL Form 01 • QĐ 3385/QĐ-DCT
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {semesters.length > 1 && (
            <select
              value={currentSemesterId}
              onChange={(e) => setCurrentSemesterId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none shadow-2xs"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Toggle Summary vs Detailed view */}
          <button
            onClick={() => setCriteriaView(criteriaView === "summary" ? "detailed" : "summary")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Chuyển đổi giữa mẫu tóm tắt 5 nhóm tiêu chí hoặc chi tiết từng tiểu mục QĐ 3385"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>{criteriaView === "summary" ? "Xem chi tiết tiểu mục" : "Xem tóm tắt 5 tiêu chí"}</span>
          </button>

          {/* Class review simulation toggle (Administrative - guarded by feature flag) */}
          {APP_FEATURES.ENABLE_CLASS_MEETINGS && (
            <button
              onClick={() => setSimulateClassReview(!simulateClassReview)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                simulateClassReview
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
              }`}
              title="Mô phỏng điểm lớp xét và biểu quyết tại buổi sinh hoạt lớp"
            >
              <span>{simulateClassReview ? "Đang mô phỏng Lớp xét" : "Mô phỏng Lớp xét"}</span>
            </button>
          )}

          {/* Export JSON backup */}
          <button
            onClick={handleExportForm01Json}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Tải về file sao lưu hồ sơ Form 01 định dạng JSON"
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã xuất file!</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 text-slate-600" />
                <span>Sao lưu JSON</span>
              </>
            )}
          </button>

          {/* Share summary */}
          <button
            onClick={handleShareSummary}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Chia sẻ kết quả qua Zalo / Mobile Share"
          >
            {shareFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">{shareFeedback}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Gửi Zalo</span>
              </>
            )}
          </button>

          {/* Audit modal */}
          <button
            onClick={() => setAuditModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Kiểm tra tính hợp lệ và độ sẵn sàng của hồ sơ trước khi nộp"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kiểm tra hồ sơ</span>
          </button>

          {/* Annual Consolidation (Điều 11) */}
          <button
            onClick={() => setAnnualReportOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Tổng hợp điểm rèn luyện năm học theo Điều 11 QĐ 3385"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tổng hợp năm học (Điều 11)</span>
          </button>

          {/* DRL Appeal (Điều 13 - Administrative - guarded by feature flag) */}
          {APP_FEATURES.ENABLE_APPEAL_DOSSIER && (
            <button
              onClick={() => setAppealModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Soạn đơn khiếu nại kết quả rèn luyện theo Điều 13 QĐ 3385"
            >
              <FileQuestion className="w-3.5 h-3.5 text-rose-600" />
              <span>Khiếu nại (Điều 13)</span>
            </button>
          )}

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="In phiếu hoặc xuất định dạng PDF"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>In phiếu / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-sm rounded-xl p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:rounded-none">
        {/* Institutional Header */}
        <div className="grid grid-cols-2 gap-4 text-center pb-6 border-b border-slate-200">
          <div>
            <p className="text-[11px] sm:text-xs font-medium uppercase text-slate-600 tracking-wider">
              BỘ CÔNG THƯƠNG
            </p>
            <p className="text-xs sm:text-sm font-bold uppercase text-slate-900 mt-0.5">
              TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM
            </p>
            <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-1" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase text-slate-900">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-800 mt-0.5">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="w-28 h-0.5 bg-slate-900 mx-auto mt-1" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-6 space-y-1">
          <h1 className="text-base sm:text-xl font-bold uppercase tracking-tight text-slate-900">
            PHIẾU TỰ ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN
          </h1>
          <p className="text-xs font-semibold text-slate-800 tracking-wider">
            (MẪU 01 - BAN HÀNH KÈM THEO QUYẾT ĐỊNH SỐ 3385/QĐ-DCT NGÀY 12/8/2026 CỦA HIỆU TRƯỞNG)
          </p>
          <p className="text-xs font-semibold text-slate-800 mt-1">
            {currentSemester ? currentSemester.name : "Học kỳ"}
          </p>
        </div>

        {/* Student Information Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5 print:bg-white print:border-slate-300">
          <div>
            <span className="text-slate-500">Họ và tên sinh viên:</span>{" "}
            <span className="font-bold text-slate-900">{user.fullName}</span>
          </div>
          <div>
            <span className="text-slate-500">Mã số sinh viên (MSSV):</span>{" "}
            <span className="font-mono font-semibold text-slate-900">@{user.username}</span>
          </div>
          <div>
            <span className="text-slate-500">Lớp sinh hoạt:</span>{" "}
            <span className="font-medium text-slate-900">{user.className || "Chưa cập nhật"}</span>
          </div>
          <div>
            <span className="text-slate-500">Khoa quản lý chuyên môn:</span>{" "}
            <span className="font-medium text-slate-900">{user.faculty || "Chưa cập nhật"}</span>
          </div>
          <div>
            <span className="text-slate-500">Bậc đào tạo:</span>{" "}
            <span className="font-medium text-slate-900">Đại học chính quy</span>
          </div>
          <div>
            <span className="text-slate-500">Niên khóa:</span>{" "}
            <span className="font-medium text-slate-900">
              {currentSemester?.name.match(/\d{4}\s*-\s*\d{4}/)?.[0] || "2024-2028"}
            </span>
          </div>
        </div>

        {/* Evidence Online Folder & QR Code */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:bg-white print:border-slate-300">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <QrIcon className="w-4 h-4 text-slate-700" />
              <span>Tra Cứu Minh Chứng Trực Tuyến (QR Code)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Mã QR liên kết trực tiếp tới thư mục lưu trữ ảnh chứng chỉ / minh chứng (Google Drive / OneDrive) để Ban cán sự và Thư ký lớp quét đối soát nhanh chóng khi họp xét.
            </p>
            <div className="no-print pt-1 flex items-center space-x-2">
              <input
                type="url"
                placeholder={`Dán link Google Drive hoặc dùng mẫu: ${APP_CONFIG.sampleEvidenceDriveUrl}`}
                value={evidenceFolderUrl}
                onChange={(e) => {
                  setEvidenceFolderUrl(e.target.value);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("huit_evidence_url", e.target.value);
                  }
                }}
                className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
              />
              {!evidenceFolderUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const sampleUrl = APP_CONFIG.sampleEvidenceDriveUrl;
                    setEvidenceFolderUrl(sampleUrl);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("huit_evidence_url", sampleUrl);
                    }
                  }}
                  className="px-2.5 py-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 border border-slate-200"
                >
                  Dùng link mẫu
                </button>
              )}
            </div>
            {evidenceFolderUrl && (
              <div className="text-[10px] text-blue-800 font-mono truncate max-w-lg mt-0.5">
                Link: {evidenceFolderUrl}
              </div>
            )}
          </div>

          {evidenceFolderUrl ? (
            <div className="shrink-0">
              <QrCodeViewer
                value={evidenceFolderUrl}
                size={105}
                label="Quét xem minh chứng"
                showLink={false}
              />
            </div>
          ) : (
            <div className="shrink-0 no-print text-[11px] text-slate-400 italic border border-dashed border-slate-300 rounded-lg p-3 text-center">
              Nhập link Drive để in mã QR lên biểu mẫu
            </div>
          )}
        </div>

        {/* View Mode Indicator (No-print) */}
        <div className="no-print mb-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Đang hiển thị:</span>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-medium">
              {criteriaView === "summary"
                ? "Bản in tiêu chuẩn (5 nhóm tiêu chí)"
                : "Bản in chi tiết (Toàn bộ tiểu mục QĐ 3385)"}
            </span>
          </div>
          {simulateClassReview && (
            <span className="text-amber-800 font-medium">
              Đang bật chế độ chỉnh sửa điểm Lớp đánh giá
            </span>
          )}
        </div>

        {/* Main Criteria Evaluation Table */}
        {criteriaView === "summary" ? (
          /* SUMMARY TABLE: 5 GROUPS */
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300 w-12 text-center">TT</th>
                  <th className="p-2.5 border-r border-slate-300">Nội dung đánh giá rèn luyện (QĐ 3385)</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-20">Khung tối đa</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-24">SV tự chấm</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-24">Lớp đánh giá</th>
                  <th className="p-2.5 text-center w-24">Khoa duyệt</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((catNum) => {
                  const meta = CATEGORIES[catNum];
                  const res = scoreSummary.categories[catNum] || {
                    rawScore: meta.defaultPoints,
                    cappedScore: meta.defaultPoints,
                    maxPoints: meta.maxPoints,
                    recordsCount: 0,
                  };

                  return (
                    <tr key={catNum} className="border-b border-slate-300 hover:bg-slate-50">
                      <td className="p-2.5 border-r border-slate-300 text-center font-bold">
                        {meta.code}
                      </td>
                      <td className="p-2.5 border-r border-slate-300">
                        <div className="font-semibold text-slate-900">{meta.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{meta.description}</div>
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-semibold">
                        {meta.maxPoints}đ
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-bold text-slate-900 bg-slate-50/50">
                        {res.cappedScore}đ
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono">
                        {simulateClassReview ? (
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min={0}
                              max={meta.maxPoints}
                              value={classScores[catNum] ?? res.cappedScore}
                              onChange={(e) => {
                                const val = Math.min(meta.maxPoints, Math.max(0, parseInt(e.target.value, 10) || 0));
                                setClassScores((prev) => ({ ...prev, [catNum]: val }));
                              }}
                              className="w-12 text-center text-xs font-bold border border-slate-300 rounded p-1 bg-white no-print"
                            />
                            <span className="print:inline hidden font-bold text-slate-900">
                              {classScores[catNum] ?? res.cappedScore}đ
                            </span>
                            {(classScores[catNum] ?? res.cappedScore) !== res.cappedScore && (
                              <span
                                className={`text-[10px] font-bold ${
                                  (classScores[catNum] ?? res.cappedScore) > res.cappedScore
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }`}
                              >
                                {(classScores[catNum] ?? res.cappedScore) > res.cappedScore
                                  ? `+${(classScores[catNum] ?? res.cappedScore) - res.cappedScore}`
                                  : (classScores[catNum] ?? res.cappedScore) - res.cappedScore}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-900 font-bold">
                            {classScores[catNum] !== undefined ? `${classScores[catNum]}đ` : "....."}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center text-slate-400 font-mono">
                        .....
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={2} className="p-2.5 text-right border-r border-slate-300 uppercase">
                    Tổng điểm rèn luyện (Thang 100):
                  </td>
                  <td className="p-2.5 text-center border-r border-slate-300 font-bold">100đ</td>
                  <td className="p-2.5 text-center text-sm font-extrabold bg-slate-200 border-r border-slate-300">
                    {scoreSummary.totalScore}đ
                  </td>
                  <td className="p-2.5 text-center text-slate-900 border-r border-slate-300 font-mono text-sm font-extrabold">
                    {simulateClassReview ? (
                      <span>{simulatedTotalClassScore}đ</span>
                    ) : (
                      <span>{simulatedTotalClassScore}đ</span>
                    )}
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">
                    .....
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          /* DETAILED TABLE: 65 CRITERIA ITEMS FROM QĐ 3385 */
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-12 text-center">STT</th>
                  <th className="p-2 border-r border-slate-300">Tiểu mục tiêu chuẩn đánh giá (Điều 5 QĐ 3385)</th>
                  <th className="p-2 border-r border-slate-300 text-center w-24">Khung điểm</th>
                  <th className="p-2 border-r border-slate-300 text-center w-20">SV tự chấm</th>
                  <th className="p-2 border-r border-slate-300 text-center w-20">Lớp chấm</th>
                  <th className="p-2 text-center w-20">Khoa duyệt</th>
                </tr>
              </thead>
              <tbody>
                {detailedFormData?.groups.map((grp) => (
                  <React.Fragment key={grp.group.category}>
                    {/* Header of group */}
                    <tr className="bg-slate-100/80 font-bold text-slate-900 border-y border-slate-300">
                      <td className="p-2 border-r border-slate-300 text-center bg-slate-200">
                        {grp.group.code}
                      </td>
                      <td className="p-2 border-r border-slate-300 uppercase">
                        {grp.group.title} (Tối đa {grp.group.maxPoints}đ)
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">
                        {grp.group.maxPoints}đ
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-extrabold text-blue-900 bg-blue-50/50">
                        {grp.categoryScore}đ
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">
                        {classScores[grp.group.category] ?? grp.categoryScore}đ
                      </td>
                      <td className="p-2 text-center text-slate-400 font-mono">.....</td>
                    </tr>

                    {/* Sub-rows */}
                    {grp.subRows.map((sub) => (
                      <tr key={sub.item.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono text-[11px] text-slate-500">
                          {sub.item.itemCode}
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <span className="text-slate-800">{sub.item.title}</span>
                          {sub.records.length > 0 && (
                            <span className="block text-[10px] text-slate-500 mt-0.5 italic">
                              Đã ghi nhận: {sub.records.map((r) => r.title).join("; ")}
                            </span>
                          )}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono text-[11px] text-slate-600">
                          {sub.item.maxScoreText}
                        </td>
                        <td className={`p-1.5 border-r border-slate-200 text-center font-mono text-xs font-semibold ${
                          sub.studentScore > 0 ? "text-emerald-700" : sub.studentScore < 0 ? "text-red-700" : "text-slate-400"
                        }`}>
                          {sub.studentScore !== 0 ? `${sub.studentScore > 0 ? "+" : ""}${sub.studentScore}đ` : "-"}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center text-slate-300 font-mono">
                          .....
                        </td>
                        <td className="p-1.5 text-center text-slate-300 font-mono">
                          .....
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Total Row */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={2} className="p-2.5 text-right border-r border-slate-300 uppercase">
                    Tổng điểm rèn luyện (Thang 100):
                  </td>
                  <td className="p-2.5 text-center border-r border-slate-300 font-bold">100đ</td>
                  <td className="p-2.5 text-center text-sm font-extrabold bg-slate-200 border-r border-slate-300">
                    {scoreSummary.totalScore}đ
                  </td>
                  <td className="p-2.5 text-center text-slate-900 border-r border-slate-300 font-mono text-sm font-extrabold">
                    {simulatedTotalClassScore}đ
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">
                    .....
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Classification Result Box */}
        <div className="p-4 rounded-lg border border-slate-300 bg-slate-50 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 print:bg-white print:border-slate-300">
          <div>
            <div className="text-xs text-slate-500">Kết quả xếp loại học kỳ:</div>
            <div className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
              <span>{scoreSummary.rating.label}</span>
              {scoreSummary.rating.note && (
                <span className="text-xs font-normal text-amber-700">
                  ({scoreSummary.rating.note})
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-600 text-right sm:max-w-xs">
            Quy chuẩn QĐ 3385: Xuất sắc (90-100đ), Tốt (80-89đ), Khá (70-79đ), Trung bình (50-69đ), Yếu (&lt;50đ).
          </div>
        </div>

        {/* Activity & Evidence Ledger (Annex) */}
        {records.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Phụ lục danh mục hoạt động & rà soát minh chứng ({records.length} mục)
              </h3>

              {/* Status filter in annex (no-print) */}
              <div className="no-print flex items-center space-x-1 text-[11px]">
                <button
                  onClick={() => setAuditFilter("all")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    auditFilter === "all" ? "bg-slate-900 text-white font-bold" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Tất cả ({records.length})
                </button>
                <button
                  onClick={() => setAuditFilter("valid")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    auditFilter === "valid" ? "bg-emerald-700 text-white font-bold" : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  Hợp lệ ({auditStats.valid})
                </button>
                <button
                  onClick={() => setAuditFilter("pending_review")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    auditFilter === "pending_review" ? "bg-sky-700 text-white font-bold" : "bg-sky-50 text-sky-800"
                  }`}
                >
                  Chờ duyệt ({auditStats.pending})
                </button>
                <button
                  onClick={() => setAuditFilter("missing")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    auditFilter === "missing" ? "bg-amber-700 text-white font-bold" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  Thiếu ({auditStats.missing})
                </button>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-16 text-center">Tiêu chí</th>
                  <th className="p-2 border-r border-slate-300">Nội dung hoạt động / Vi phạm</th>
                  <th className="p-2 border-r border-slate-300 w-24 text-center">Thời gian</th>
                  <th className="p-2 border-r border-slate-300 w-14 text-center">SL</th>
                  <th className="p-2 border-r border-slate-300 text-center w-16">Điểm</th>
                  <th className="p-2 text-center w-28">Trạng thái minh chứng</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnexRecords.map((r) => {
                  const pts = Number(r.points) * (r.quantity || 1);
                  const status = r.auditStatus || (r.evidenceUrl ? "pending_review" : "missing");

                  return (
                    <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-medium text-slate-600">
                        TC{r.category}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="font-medium text-slate-800">{r.title}</span>
                        {r.note && (
                          <span className="text-[10px] text-slate-500 block italic">
                            Ghi chú: {r.note}
                          </span>
                        )}
                        {r.evidenceUrl && (
                          <span className="text-[10px] text-blue-700 block mt-0.5 font-mono truncate max-w-sm">
                            Link minh chứng: {r.evidenceUrl}
                          </span>
                        )}
                        {r.auditComment && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-amber-200">
                            Phản hồi lớp: {r.auditComment}
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                        {r.occurredAt || "-"}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center text-slate-600">
                        x{r.quantity || 1}
                      </td>
                      <td className={`p-2 border-r border-slate-200 text-center font-bold ${pts >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {pts >= 0 ? `+${pts}` : pts}đ
                      </td>
                      <td className="p-2 text-center">
                        {/* Interactive toggle in no-print */}
                        <div className="no-print">
                          <button
                            type="button"
                            onClick={() => handleUpdateAuditStatus(r.id, status)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer transition-opacity hover:opacity-80 ${
                              status === "valid"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : status === "pending_review"
                                ? "bg-sky-100 text-sky-800 border border-sky-300"
                                : status === "rejected"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                            title="Bấm để chuyển nhanh trạng thái kiểm duyệt"
                          >
                            {status === "valid" && <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />}
                            {status === "pending_review" && <Clock className="w-2.5 h-2.5 mr-0.5" />}
                            {status === "rejected" && <XCircle className="w-2.5 h-2.5 mr-0.5" />}
                            {status === "missing" && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                            <span>
                              {status === "valid"
                                ? "Hợp lệ"
                                : status === "pending_review"
                                ? "Chờ duyệt"
                                : status === "rejected"
                                ? "Cần bổ sung"
                                : "Thiếu ảnh"}
                            </span>
                          </button>
                        </div>
                        {/* Print representation */}
                        <span className="hidden print:inline text-[11px] font-semibold text-slate-800">
                          {status === "valid"
                            ? "Hợp lệ"
                            : status === "pending_review"
                            ? "Chờ duyệt"
                            : status === "rejected"
                            ? "Cần bổ sung"
                            : "Thiếu minh chứng"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature Blocks - 3 Parties (Student, Class Monitor, Academic Advisor) */}
        <div className="grid grid-cols-3 gap-4 text-center pt-8 text-xs border-t border-slate-200">
          <div>
            <p className="font-bold uppercase text-slate-900">SINH VIÊN TỰ ĐÁNH GIÁ</p>
            <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900">{user.fullName}</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">BAN CÁN SỰ LỚP</p>
            <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="text-slate-400">....................................</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">CỐ VẤN HỌC TẬP</p>
            <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="text-slate-400">....................................</p>
          </div>
        </div>

        {/* Official Footer Note */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 italic">
          Mẫu số 01 - Ban hành kèm theo Quyết định số 3385/QĐ-DCT ngày 12 tháng 8 năm 2026 của Hiệu trưởng Trường Đại học Công Thương TP.HCM
        </div>
      </div>

      <PreFlightAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        semester={currentSemester || null}
        records={records}
      />

      <AnnualReportModal
        isOpen={annualReportOpen}
        onClose={() => setAnnualReportOpen(false)}
        user={user}
        semesters={semesters}
      />

      <DrlAppealModal
        isOpen={appealModalOpen}
        onClose={() => setAppealModalOpen(false)}
        currentUser={{
          fullName: user?.fullName || "Sinh viên",
          studentId: user?.studentId || undefined,
          className: user?.className || undefined,
          faculty: user?.faculty || undefined,
        }}
        currentScore={scoreSummary?.totalScore || 60}
        currentSemester={currentSemester?.name || "Học kỳ 1"}
        currentYear={currentSemester?.name.match(/\d{4}-\d{4}/)?.[0] || "2024-2025"}
      />
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}

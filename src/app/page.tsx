"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { CriteriaBreakdown } from "@/components/dashboard/CriteriaBreakdown";
import { GoalTrackerCard } from "@/components/dashboard/GoalTrackerCard";
import { CumulativeStatsCard } from "@/components/dashboard/CumulativeStatsCard";
import { OfflineSyncBanner } from "@/components/common/OfflineSyncBanner";
import { RecordList } from "@/components/records/RecordList";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { PreFlightAuditModal } from "@/components/modals/PreFlightAuditModal";
import { CsvExchangeModal } from "@/components/modals/CsvExchangeModal";
import { SmartRecommendationsCard } from "@/components/dashboard/SmartRecommendationsCard";
import { CumulativeTranscriptSheet } from "@/components/dashboard/CumulativeTranscriptSheet";
import { Sv5tAuditorModal } from "@/components/dashboard/Sv5tAuditorModal";
import { BackupRestoreModal } from "@/components/modals/BackupRestoreModal";
import { ClassMeetingModal } from "@/components/dashboard/ClassMeetingModal";
import { NetworkRecoveryListener } from "@/components/common/NetworkRecoveryListener";
import { DeadlineAlertBanner } from "@/components/common/DeadlineAlertBanner";
import { DrlRecord, Semester, DrlCriteriaPreset } from "@/lib/db/schema";
import { ScoreCalculationResult, GoalAnalysisResult } from "@/lib/drl/calculator";
import { saveSemesterCache, getSemesterCache, saveUserSemestersCache, getUserSemestersCache } from "@/lib/offline/cache";
import { Plus, RefreshCw, FileText, ShieldCheck, FileSpreadsheet, WifiOff, Award, Database, Users } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [scoreSummary, setScoreSummary] = useState<ScoreCalculationResult | null>(null);
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysisResult | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialCategory, setModalInitialCategory] = useState<number | undefined>(undefined);
  const [selectedPresetToAdd, setSelectedPresetToAdd] = useState<DrlCriteriaPreset | null>(null);
  const [editingRecord, setEditingRecord] = useState<DrlRecord | null>(null);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [sv5tModalOpen, setSv5tModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [classMeetingModalOpen, setClassMeetingModalOpen] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);

  // 1. Check Auth & Load Semesters
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          loadSemesters();
        }
      })
      .catch(() => {
        // If offline and we have cached user or semesters, attempt to load
        const cachedSems = getUserSemestersCache();
        if (cachedSems && cachedSems.length > 0) {
          setSemesters(cachedSems);
          const current = cachedSems.find((s) => s.isCurrent) || cachedSems[0];
          setCurrentSemesterId(current.id);
          setIsUsingCache(true);
        } else {
          router.push("/login");
        }
      });
  }, [router]);

  const loadSemesters = async () => {
    try {
      const res = await fetch("/api/semesters");
      const data = await res.json();
      if (data.semesters && data.semesters.length > 0) {
        setSemesters(data.semesters);
        saveUserSemestersCache(data.semesters);
        const current = data.semesters.find((s: Semester) => s.isCurrent) || data.semesters[0];
        setCurrentSemesterId(current.id);
      }
    } catch (e) {
      console.warn("Semesters fetch failed, trying offline cache:", e);
      const cached = getUserSemestersCache();
      if (cached && cached.length > 0) {
        setSemesters(cached);
        const current = cached.find((s) => s.isCurrent) || cached[0];
        setCurrentSemesterId(current.id);
        setIsUsingCache(true);
      }
    }
  };

  // 2. Load Records for Current Semester
  const loadRecords = useCallback(async () => {
    if (!currentSemesterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/records?semesterId=${currentSemesterId}`);
      const data = await res.json();
      if (data && !data.error) {
        setRecords(data.records || []);
        setScoreSummary(data.scoreSummary);
        setGoalAnalysis(data.goalAnalysis);
        setIsUsingCache(false);
        // Save to offline snapshot
        saveSemesterCache(currentSemesterId, {
          records: data.records || [],
          scoreSummary: data.scoreSummary,
          goalAnalysis: data.goalAnalysis,
        });
      }

      // Load multi-semester analytics
      fetch("/api/analytics")
        .then((r) => r.json())
        .then((anData) => {
          if (anData && anData.hasData) setAnalyticsData(anData);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Records fetch failed, restoring from offline cache:", e);
      const cached = getSemesterCache(currentSemesterId);
      if (cached) {
        setRecords(cached.records || []);
        if (cached.scoreSummary) setScoreSummary(cached.scoreSummary);
        if (cached.goalAnalysis) setGoalAnalysis(cached.goalAnalysis);
        setIsUsingCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, [currentSemesterId]);

  useEffect(() => {
    if (currentSemesterId) {
      loadRecords();
    }
  }, [currentSemesterId, loadRecords]);

  // Handle Target Update
  const handleUpdateTarget = async (newTarget: number) => {
    if (!currentSemesterId) return;
    try {
      await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentSemesterId, targetScore: newTarget }),
      });
      loadRecords();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Record Delete
  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadRecords();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-2 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  const currentSemester = semesters.find((s) => s.id === currentSemesterId);

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-50 text-slate-900">
      <Header
        user={user}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
        onOpenNewSemesterModal={() => setNewSemesterModalOpen(true)}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Top greeting & summary banner */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">
                {currentSemester ? currentSemester.name : "Học kỳ"}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-500">@{user.username}</span>
              {user.className && (
                <>
                  <span>•</span>
                  <span>Lớp: {user.className}</span>
                </>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Xin chào, {user.fullName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động tính điểm và theo dõi mục tiêu rèn luyện cá nhân
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setCsvModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Xuất hoặc nhập bảng kê hoạt động bằng file Excel CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel CSV</span>
            </button>

            <button
              onClick={() => setAuditModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Kiểm tra tính hợp lệ và minh chứng của hồ sơ"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kiểm tra hồ sơ</span>
            </button>

            <button
              onClick={() => setSv5tModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Thẩm định tiêu chuẩn Sinh viên 5 tốt HUIT"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Sinh viên 5 tốt</span>
            </button>

            <button
              onClick={() => setBackupModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Sao lưu và khôi phục dữ liệu học kỳ JSON"
            >
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>Sao lưu</span>
            </button>

            <button
              onClick={() => setClassMeetingModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Biên bản họp lớp và bảng tổng hợp rèn luyện Điều 9-10"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Họp lớp & Biên bản</span>
            </button>

            <Link
              href={`/report?semesterId=${currentSemesterId}`}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất phiếu QĐ 3385</span>
            </Link>

            <button
              onClick={() => {
                setModalInitialCategory(undefined);
                setModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Ghi nhận điểm</span>
            </button>

            <button
              onClick={loadRecords}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Semester Deadline & Status Banner */}
        {currentSemester && (
          <DeadlineAlertBanner
            semesterId={currentSemester.id}
            semesterName={currentSemester.name}
            deadline={currentSemester.submissionDeadline}
            status={currentSemester.status}
            onUpdateSemester={(up) => {
              setSemesters((prev) =>
                prev.map((s) => (s.id === currentSemester.id ? { ...s, ...up } : s))
              );
            }}
          />
        )}

        {/* Offline Sync Banner */}
        <OfflineSyncBanner onSyncComplete={loadRecords} />

        {/* Offline Cache Indicator */}
        {isUsingCache && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center space-x-2.5 shadow-xs">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Đang xem bản lưu ngoại tuyến (Offline Snapshot):</span>{" "}
              <span>Ứng dụng hiển thị bản sao gần nhất khi bạn không có kết nối internet. Mọi dữ liệu sẽ tự động cập nhật khi có mạng trở lại.</span>
            </div>
          </div>
        )}

        {/* Score Gauge */}
        {scoreSummary && (
          <ScoreGauge
            score={scoreSummary.totalScore}
            rating={scoreSummary.rating}
            defaultPoints={scoreSummary.totalDefaultPoints}
            earnedPoints={scoreSummary.totalEarnedPoints}
            deductedPoints={scoreSummary.totalDeductedPoints}
            onOpenAddModal={() => {
              setModalInitialCategory(undefined);
              setModalOpen(true);
            }}
          />
        )}

        {/* Goal Tracker */}
        {goalAnalysis && (
          <GoalTrackerCard
            analysis={goalAnalysis}
            onUpdateTarget={handleUpdateTarget}
          />
        )}

        {/* Smart Recommendations */}
        {goalAnalysis && (
          <SmartRecommendationsCard
            analysis={goalAnalysis}
            onSelectPresetToAdd={(preset) => {
              setSelectedPresetToAdd(preset);
              setModalOpen(true);
            }}
          />
        )}

        {/* Cumulative Multi-Semester Stats */}
        <CumulativeStatsCard
          data={analyticsData}
          currentSemesterId={currentSemesterId}
          onSelectSemester={setCurrentSemesterId}
          onOpenTranscript={() => setTranscriptOpen(true)}
        />

        {/* 5 Criteria Breakdown */}
        {scoreSummary && (
          <CriteriaBreakdown
            categories={scoreSummary.categories}
            onSelectCategoryToAdd={(cat) => {
              setModalInitialCategory(cat);
              setModalOpen(true);
            }}
          />
        )}

        {/* Record List */}
        <RecordList
          records={records}
          studentName={user?.fullName}
          studentClass={user?.className}
          onDeleteRecord={handleDeleteRecord}
          onEditRecord={(r) => {
            setEditingRecord(r);
            setModalOpen(true);
          }}
          onOpenAddModal={() => {
            setEditingRecord(null);
            setModalInitialCategory(undefined);
            setModalOpen(true);
          }}
        />
      </main>

      {/* Modal Add / Edit Record */}
      <AddRecordModal
        isOpen={modalOpen}
        semesterId={currentSemesterId}
        initialCategory={modalInitialCategory}
        initialPreset={selectedPresetToAdd}
        recordToEdit={editingRecord}
        onClose={() => {
          setModalOpen(false);
          setEditingRecord(null);
          setSelectedPresetToAdd(null);
        }}
        onSuccess={loadRecords}
      />

      {/* Reusable New Semester Modal */}
      <NewSemesterModal
        isOpen={newSemesterModalOpen}
        onClose={() => setNewSemesterModalOpen(false)}
        onCreated={async (newSem) => {
          await loadSemesters();
          if (newSem?.id) setCurrentSemesterId(newSem.id);
        }}
      />

      <PreFlightAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        semester={currentSemester || null}
        records={records}
        onNavigateToReport={() => router.push(`/report?semesterId=${currentSemesterId}`)}
      />

      <CsvExchangeModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        semester={currentSemester || null}
        records={records}
        onImportComplete={loadRecords}
      />

      <CumulativeTranscriptSheet
        isOpen={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        user={user}
        analyticsData={analyticsData}
      />

      <Sv5tAuditorModal
        isOpen={sv5tModalOpen}
        onClose={() => setSv5tModalOpen(false)}
        drlScore={scoreSummary?.totalScore || 60}
        disciplineLevel={currentSemester?.disciplineLevel || "none"}
        records={records}
        studentName={user?.fullName}
        studentClass={user?.className || undefined}
      />

      <NetworkRecoveryListener onSyncComplete={loadRecords} />

      <BackupRestoreModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        onRestoreComplete={async () => {
          await loadSemesters();
          await loadRecords();
        }}
      />

      <ClassMeetingModal
        isOpen={classMeetingModalOpen}
        onClose={() => setClassMeetingModalOpen(false)}
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

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => {
          setEditingRecord(null);
          setModalInitialCategory(undefined);
          setModalOpen(true);
        }}
        aria-label="Thêm hoạt động"
        className="sm:hidden fixed right-4 bottom-20 z-40 w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
      >
        <Plus className="w-5 h-5 text-amber-400" />
      </button>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}

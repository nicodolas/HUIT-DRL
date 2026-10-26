"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { CriteriaBreakdown } from "@/components/dashboard/CriteriaBreakdown";
import { DrlRadarCard } from "@/components/dashboard/DrlRadarCard";
import { GoalTrackerCard } from "@/components/dashboard/GoalTrackerCard";
import { CumulativeStatsCard } from "@/components/dashboard/CumulativeStatsCard";
import { OfflineSyncBanner } from "@/components/common/OfflineSyncBanner";
import { RecordList } from "@/components/records/RecordList";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { CsvExchangeModal } from "@/components/modals/CsvExchangeModal";
import { SmartRecommendationsCard } from "@/components/dashboard/SmartRecommendationsCard";
import { CumulativeTranscriptSheet } from "@/components/dashboard/CumulativeTranscriptSheet";
import { BackupRestoreModal } from "@/components/modals/BackupRestoreModal";
import { ProofVaultModal } from "@/components/dashboard/ProofVaultModal";
import { GraduationForecastModal } from "@/components/dashboard/GraduationForecastModal";
import { DisciplineChecklistCard } from "@/components/dashboard/DisciplineChecklistCard";
import { StudentUtilitiesMenu } from "@/components/dashboard/StudentUtilitiesMenu";
import { AdminHubModal } from "@/components/modals/AdminHubModal";
import { NetworkRecoveryListener } from "@/components/common/NetworkRecoveryListener";
import { DrlRecord, Semester, DrlCriteriaPreset } from "@/lib/db/schema";
import { ScoreCalculationResult, GoalAnalysisResult } from "@/lib/drl/calculator";
import { saveSemesterCache, getSemesterCache, saveUserSemestersCache, getUserSemestersCache } from "@/lib/offline/cache";
import { triggerHaptic } from "@/lib/native/platform";
import { Plus, WifiOff, BookOpen, ListChecks, Compass } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"records" | "criteria" | "analytics">("records");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialCategory, setModalInitialCategory] = useState<number | undefined>(undefined);
  const [selectedPresetToAdd, setSelectedPresetToAdd] = useState<DrlCriteriaPreset | null>(null);
  const [editingRecord, setEditingRecord] = useState<DrlRecord | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [proofVaultOpen, setProofVaultOpen] = useState(false);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [adminHubOpen, setAdminHubOpen] = useState(false);
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
        const cur = data.semesters.find((s: Semester) => s.isCurrent) || data.semesters[0];
        setCurrentSemesterId(cur.id);
      }
    } catch {
      const cached = getUserSemestersCache();
      if (cached && cached.length > 0) {
        setSemesters(cached);
        const cur = cached.find((s) => s.isCurrent) || cached[0];
        setCurrentSemesterId(cur.id);
        setIsUsingCache(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Records when semester changes
  useEffect(() => {
    if (!currentSemesterId) return;
    loadRecords();
  }, [currentSemesterId]);

  const loadRecords = async () => {
    if (!currentSemesterId) return;
    setLoading(true);

    const cachedData = getSemesterCache(currentSemesterId);
    if (cachedData && cachedData.records) {
      setRecords(cachedData.records);
      if (cachedData.scoreSummary) setScoreSummary(cachedData.scoreSummary);
      if (cachedData.goalAnalysis) setGoalAnalysis(cachedData.goalAnalysis);
    }

    try {
      const res = await fetch(`/api/records?semesterId=${currentSemesterId}`);
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
        setScoreSummary(data.scoreSummary);
        setGoalAnalysis(data.goalAnalysis);
        setIsUsingCache(false);
        saveSemesterCache(currentSemesterId, {
          records: data.records,
          scoreSummary: data.scoreSummary,
          goalAnalysis: data.goalAnalysis,
        });
      }
    } catch {
      setIsUsingCache(true);
    } finally {
      setLoading(false);
      loadAnalytics();
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (e) {
      console.warn("Analytics fetch failed:", e);
    }
  };

  const handleUpdateTarget = async (targetScore: number) => {
    try {
      const res = await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentSemesterId, targetScore }),
      });
      if (res.ok) {
        loadRecords();
      }
    } catch (e) {
      console.error(e);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-2 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Đang tải sổ rèn luyện...</span>
        </div>
      </div>
    );
  }

  const currentSemester = semesters.find((s) => s.id === currentSemesterId);
  const initials = (() => {
    if (!user?.fullName) return "SV";
    const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "SV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        user={user}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
      />

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Personal Student Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all relative overflow-hidden">
          {/* Subtle Accent Stripe representing HUIT identity */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-900 via-indigo-600 to-amber-500" />

          <div className="flex items-center space-x-3.5 min-w-0">
            <Link
              href="/profile"
              title="Đến trang cá nhân"
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-indigo-600 dark:to-indigo-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm hover:scale-105 transition-transform group cursor-pointer"
            >
              {initials}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-[280px]" title={currentSemester?.name}>
                  {currentSemester ? currentSemester.name : "Chưa chọn học kỳ"}
                </span>
                <span>•</span>
                <span className="font-mono text-slate-500">@{user.username}</span>
                {user.className && <span>• {user.className}</span>}
                <Link
                  href="/profile"
                  className="inline-flex items-center space-x-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                >
                  <span>(Hồ sơ cá nhân ↗)</span>
                </Link>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate mt-0.5">
                Sổ tay rèn luyện: {user.fullName}
              </h1>
            </div>
          </div>

          <div className="shrink-0">
            <StudentUtilitiesMenu
              currentSemesterId={currentSemesterId}
              isAdmin={user?.role === "admin"}
              onOpenAddModal={() => {
                setModalInitialCategory(undefined);
                setModalOpen(true);
              }}
              onOpenProofVault={() => setProofVaultOpen(true)}
              onOpenForecastModal={() => setForecastModalOpen(true)}
              onOpenCsvModal={() => setCsvModalOpen(true)}
              onOpenBackupModal={() => setBackupModalOpen(true)}
              onOpenAdminHub={user?.role === "admin" ? () => setAdminHubOpen(true) : undefined}
              onRefresh={loadRecords}
              loading={loading}
            />
          </div>
        </div>

        {/* Offline Sync Banner */}
        <OfflineSyncBanner onSyncComplete={loadRecords} />

        {/* Offline Cache Indicator */}
        {isUsingCache && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-center space-x-2.5 shadow-xs">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Đang xem bản lưu ngoại tuyến (Offline):</span>{" "}
              <span>Dữ liệu hiển thị từ bộ nhớ thiết bị. Sẽ tự động đồng bộ khi có kết nối trở lại.</span>
            </div>
          </div>
        )}

        {/* Compact Modern Score Overview Gauge */}
        {scoreSummary && (
          <ScoreGauge
            score={scoreSummary.totalScore}
            rating={scoreSummary.rating}
            defaultPoints={scoreSummary.totalDefaultPoints}
            earnedPoints={scoreSummary.totalEarnedPoints}
            deductedPoints={scoreSummary.totalDeductedPoints}
            categories={scoreSummary.categories}
            onOpenAddModal={() => {
              setModalInitialCategory(undefined);
              setModalOpen(true);
            }}
          />
        )}

        {/* Modern Segmented Tab Navigation */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold gap-1.5 shadow-2xs">
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("records");
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
              activeTab === "records"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/50 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 font-medium"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nhật ký hoạt động</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "records"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  : "bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {records.length}
            </span>
          </button>

          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("criteria");
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
              activeTab === "criteria"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/50 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 font-medium"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>5 Tiêu chí QĐ 3385</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("analytics");
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
              activeTab === "analytics"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/50 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 font-medium"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Mục tiêu & Radar</span>
          </button>
        </div>

        {/* Tab 1: Personal Activity Log (Primary View) */}
        {activeTab === "records" && (
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
        )}

        {/* Tab 2: 5 Criteria Breakdown & Discipline Checklist */}
        {activeTab === "criteria" && scoreSummary && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <DisciplineChecklistCard semesterId={currentSemesterId} />
            <CriteriaBreakdown
              categories={scoreSummary.categories}
              onSelectCategoryToAdd={(cat) => {
                setModalInitialCategory(cat);
                setModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 3: Analytics, Radar & Goal Tracker */}
        {activeTab === "analytics" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 5 Criteria Radar */}
            {scoreSummary && (
              <DrlRadarCard
                categories={scoreSummary.categories}
                onSelectCategoryToAdd={(cat) => {
                  setModalInitialCategory(cat);
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
              onOpenForecast={() => setForecastModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) for Mobile / Android */}
      <button
        onClick={() => {
          triggerHaptic("medium");
          setModalInitialCategory(undefined);
          setModalOpen(true);
        }}
        className="fixed bottom-20 right-4 z-40 sm:hidden w-13 h-13 rounded-full bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer border border-white/20"
        aria-label="Thêm hoạt động mới"
      >
        <Plus className="w-6 h-6 text-amber-400 dark:text-slate-950" />
      </button>

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

      <ProofVaultModal
        isOpen={proofVaultOpen}
        onClose={() => setProofVaultOpen(false)}
        records={records}
        semester={currentSemester || null}
        currentUser={{
          fullName: user?.fullName || "Sinh viên",
          studentId: user?.studentId,
          className: user?.className,
          faculty: user?.faculty,
        }}
      />

      <GraduationForecastModal
        isOpen={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        semesterData={analyticsData?.semesters || []}
        studentName={user?.fullName}
        studentClass={user?.className}
      />

      <AdminHubModal
        isOpen={adminHubOpen}
        onClose={() => setAdminHubOpen(false)}
        semesters={semesters}
        onSemesterCreated={loadSemesters}
      />

      <BackupRestoreModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        onRestoreComplete={() => {
          loadSemesters();
          loadRecords();
        }}
      />

      {/* Offline and Network Recovery Listeners */}
      <NetworkRecoveryListener onSyncComplete={loadRecords} />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

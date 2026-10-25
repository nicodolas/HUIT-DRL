"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { CriteriaBreakdown } from "@/components/dashboard/CriteriaBreakdown";
import { GoalTrackerCard } from "@/components/dashboard/GoalTrackerCard";
import { RecordList } from "@/components/records/RecordList";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { ScoreCalculationResult, GoalAnalysisResult } from "@/lib/drl/calculator";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [scoreSummary, setScoreSummary] = useState<ScoreCalculationResult | null>(null);
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysisResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialCategory, setModalInitialCategory] = useState<number | undefined>(undefined);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState("");

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
      }
    } catch (e) {
      console.error(e);
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
      }
    } catch (e) {
      console.error(e);
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

  // Handle Create Semester
  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemesterName.trim()) return;
    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSemesterName.trim() }),
      });
      const data = await res.json();
      if (data.semester) {
        setNewSemesterModalOpen(false);
        setNewSemesterName("");
        await loadSemesters();
        setCurrentSemesterId(data.semester.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-huit-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">Đang tải dữ liệu HUIT DRL...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-100/60 text-slate-800">
      <Header
        user={user}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
        onOpenNewSemesterModal={() => setNewSemesterModalOpen(true)}
      />

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Top welcome banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-huit-blue-800 via-huit-blue-700 to-huit-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-md shadow-blue-950/10">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-orange-300 text-[11px] font-bold mb-2 backdrop-blur-xs">
              <span>Đại học Công Thương TP.HCM (HUIT)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Xin chào, {user.fullName}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1">
              {user.mssv ? `MSSV: ${user.mssv}` : ""} {user.className ? `• Lớp: ${user.className}` : ""} {user.faculty ? `• Khoa: ${user.faculty}` : ""}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setModalInitialCategory(undefined);
                setModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-huit-orange-500 hover:bg-huit-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Cộng / Trừ điểm</span>
            </button>
            <button
              onClick={loadRecords}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

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

        {/* Activity & Record List */}
        <RecordList
          records={records}
          onDeleteRecord={handleDeleteRecord}
          onOpenAddModal={() => {
            setModalInitialCategory(undefined);
            setModalOpen(true);
          }}
        />
      </main>

      {/* Modal Add Record */}
      <AddRecordModal
        isOpen={modalOpen}
        semesterId={currentSemesterId}
        initialCategory={modalInitialCategory}
        onClose={() => setModalOpen(false)}
        onSuccess={loadRecords}
      />

      {/* Modal New Semester */}
      {newSemesterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Thêm học kỳ đánh giá mới
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mỗi học kỳ sẽ tự động được khởi tạo 60 điểm mặc định (TC 1, 2, 4).
            </p>
            <form onSubmit={handleCreateSemester} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên học kỳ:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Học kỳ 2 (2025 - 2026)"
                  value={newSemesterName}
                  onChange={(e) => setNewSemesterName(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-bold"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewSemesterModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-huit-blue-700 text-white rounded-xl shadow-md hover:bg-huit-blue-800"
                >
                  Tạo học kỳ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}

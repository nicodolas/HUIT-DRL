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
import { RecordList } from "@/components/records/RecordList";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { ScoreCalculationResult, GoalAnalysisResult } from "@/lib/drl/calculator";
import { Plus, RefreshCw, FileText } from "lucide-react";

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
  const [editingRecord, setEditingRecord] = useState<DrlRecord | null>(null);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);

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

      // Load multi-semester analytics
      fetch("/api/analytics")
        .then((r) => r.json())
        .then((anData) => {
          if (anData && anData.hasData) setAnalyticsData(anData);
        })
        .catch(console.error);
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

        {/* Cumulative Multi-Semester Stats */}
        <CumulativeStatsCard
          data={analyticsData}
          currentSemesterId={currentSemesterId}
          onSelectSemester={setCurrentSemesterId}
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
        recordToEdit={editingRecord}
        onClose={() => {
          setModalOpen(false);
          setEditingRecord(null);
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

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}

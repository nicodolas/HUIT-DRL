"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { GoalTrackerCard } from "@/components/dashboard/GoalTrackerCard";
import { DrlRadarCard } from "@/components/dashboard/DrlRadarCard";
import { WhatIfSimulator } from "@/components/dashboard/WhatIfSimulator";
import { SmartRecommendationsCard } from "@/components/dashboard/SmartRecommendationsCard";
import { ScholarshipPredictionCard } from "@/components/dashboard/ScholarshipPredictionCard";
import { Sv5tAuditorModal } from "@/components/dashboard/Sv5tAuditorModal";
import { GraduationForecastModal } from "@/components/dashboard/GraduationForecastModal";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { Semester, DrlRecord, DrlCriteriaPreset } from "@/lib/db/schema";
import { GoalAnalysisResult } from "@/lib/drl/calculator";
import { Award, GraduationCap } from "lucide-react";

export default function GoalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [scoreSummary, setScoreSummary] = useState<any>(null);
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysisResult | null>(null);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sv5tModalOpen, setSv5tModalOpen] = useState(false);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [selectedPresetToAdd, setSelectedPresetToAdd] = useState<DrlCriteriaPreset | null>(null);

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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    if (!currentSemesterId) return;
    try {
      const res = await fetch(`/api/records?semesterId=${currentSemesterId}`);
      const data = await res.json();
      if (data) {
        if (data.records) setRecords(data.records);
        if (data.scoreSummary) setScoreSummary(data.scoreSummary);
        if (data.goalAnalysis) setGoalAnalysis(data.goalAnalysis);
      }

      fetch("/api/analytics")
        .then((r) => r.json())
        .then((an) => {
          if (an && an.hasData) setAnalyticsData(an);
        })
        .catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentSemesterId) loadData();
  }, [currentSemesterId]);

  const handleUpdateTarget = async (newTarget: number) => {
    if (!currentSemesterId) return;
    try {
      await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentSemesterId, targetScore: newTarget }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Mục tiêu & Kế hoạch rèn luyện
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lập kế hoạch hoàn thành các tiêu chí xét học bổng và danh hiệu sinh viên
          </p>
        </div>

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
              setAddModalOpen(true);
            }}
          />
        )}

        {/* 5 Criteria Radar & Balance Index */}
        {scoreSummary && (
          <DrlRadarCard
            categories={scoreSummary.categories}
            onSelectCategoryToAdd={(cat) => {
              setSelectedPresetToAdd(null);
              setAddModalOpen(true);
            }}
          />
        )}

        {/* What-If Simulation Engine */}
        {currentSemesterId && (
          <WhatIfSimulator
            currentRecords={records}
            disciplineLevel={semesters.find((s) => s.id === currentSemesterId)?.disciplineLevel || "none"}
            semesterId={currentSemesterId}
            onCommittedSuccess={loadData}
          />
        )}

        {/* Scholarships Policy Note from HUIT */}
        <ScholarshipPredictionCard
          currentDrlScore={goalAnalysis ? goalAnalysis.currentScore : 60}
          disciplineLevel={semesters.find((s) => s.id === currentSemesterId)?.disciplineLevel || "none"}
        />

        {/* Graduation Forecast Banner */}
        <div className="bg-linear-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 rounded-xl p-4 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Dự Báo & Mô Phỏng ĐRL Tốt Nghiệp Toàn Khóa
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Điều 12
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Tính toán số điểm trung bình cần đạt mỗi kỳ còn lại để tốt nghiệp Xuất sắc (≥90đ) hoặc Tốt (≥80đ)
              </p>
            </div>
          </div>
          <button
            onClick={() => setForecastModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Mở dự báo
          </button>
        </div>

        {/* Sinh Vien 5 Tot Quick Action Banner */}
        <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Thẩm Định Danh Hiệu "Sinh Viên 5 Tốt" HUIT
              </h3>
              <p className="text-[11px] text-slate-600">
                Kiểm tra tự động 5 tiêu chuẩn: Đạo đức, Học tập, Thể lực, Tình nguyện & Hội nhập
              </p>
            </div>
          </div>
          <button
            onClick={() => setSv5tModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0"
          >
            Mở thẩm định
          </button>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Tiêu chuẩn xét học bổng khuyến khích học tập HUIT</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Căn cứ quy chế đào tạo và khen thưởng sinh viên của Trường Đại học Công Thương TP.HCM:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            <li>
              Sinh viên cần đạt kết quả rèn luyện tối thiểu loại <strong>Khá (&ge; 70 điểm)</strong> để đủ điều kiện xét học bổng khuyến khích học tập.
            </li>
            <li>
              Học bổng loại <strong>Xuất sắc</strong> yêu cầu kết quả rèn luyện từ <strong>90 điểm trở lên</strong> và không vi phạm kỷ luật học vụ.
            </li>
            <li>
              Học bổng loại <strong>Giỏi</strong> yêu cầu kết quả rèn luyện từ <strong>80 đến dưới 90 điểm</strong>.
            </li>
          </ul>
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

      <AddRecordModal
        isOpen={addModalOpen}
        semesterId={currentSemesterId}
        initialPreset={selectedPresetToAdd}
        onClose={() => {
          setAddModalOpen(false);
          setSelectedPresetToAdd(null);
        }}
        onSuccess={loadData}
      />

      <Sv5tAuditorModal
        isOpen={sv5tModalOpen}
        onClose={() => setSv5tModalOpen(false)}
        drlScore={goalAnalysis ? goalAnalysis.currentScore : 60}
        disciplineLevel={semesters.find((s) => s.id === currentSemesterId)?.disciplineLevel || "none"}
        records={records}
        studentName={user?.fullName}
        studentClass={user?.className}
      />

      <GraduationForecastModal
        isOpen={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        semesterData={analyticsData?.semesterBreakdown || []}
        studentName={user?.fullName}
        studentClass={user?.className}
      />

      <BottomNav />
    </div>
  );
}

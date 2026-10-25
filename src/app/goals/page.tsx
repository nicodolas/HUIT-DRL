"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { GoalTrackerCard } from "@/components/dashboard/GoalTrackerCard";
import { WhatIfSimulator } from "@/components/dashboard/WhatIfSimulator";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { Semester, DrlRecord } from "@/lib/db/schema";
import { GoalAnalysisResult } from "@/lib/drl/calculator";
import { Award } from "lucide-react";

export default function GoalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysisResult | null>(null);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);

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
        if (data.goalAnalysis) setGoalAnalysis(data.goalAnalysis);
      }
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

      <BottomNav />
    </div>
  );
}

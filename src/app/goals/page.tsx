"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { GoalTrackerCard } from "@/components/dashboard/GoalTrackerCard";
import { Semester } from "@/lib/db/schema";
import { GoalAnalysisResult } from "@/lib/drl/calculator";
import { Award, Compass, BookOpen } from "lucide-react";

export default function GoalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysisResult | null>(null);

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
      if (data && data.goalAnalysis) {
        setGoalAnalysis(data.goalAnalysis);
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
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-100/60 text-slate-800">
      <Header
        user={user}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
        onOpenNewSemesterModal={() => {}}
      />

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">
            Mục tiêu & Kế hoạch rèn luyện
          </h1>
          <p className="text-xs text-slate-500">
            Theo dõi tiến độ đạt loại Xuất sắc, Tốt để xét học bổng và khen thưởng
          </p>
        </div>

        {goalAnalysis && (
          <GoalTrackerCard
            analysis={goalAnalysis}
            onUpdateTarget={handleUpdateTarget}
          />
        )}

        {/* Scholarships Policy Note from HUIT */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 space-y-3">
          <div className="flex items-center space-x-2 text-huit-blue-700 font-bold text-sm">
            <Award className="w-5 h-5 text-huit-orange-500" />
            <span>Chính sách xét học bổng khuyến khích học tập HUIT</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Căn cứ quy định đào tạo và khen thưởng của Trường Đại học Công Thương TP.HCM, sinh viên cần đạt kết quả rèn luyện tối thiểu loại <strong>Khá (&gt;= 70đ)</strong> để đủ điều kiện xét học bổng khuyến khích học tập. Để đạt mức học bổng Xuất sắc, điểm rèn luyện phải đạt từ <strong>90 điểm trở lên</strong> và không vi phạm kỷ luật học vụ.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { RecordList } from "@/components/records/RecordList";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { Plus } from "lucide-react";

export default function RecordsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

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

  const loadRecords = async () => {
    if (!currentSemesterId) return;
    try {
      const res = await fetch(`/api/records?semesterId=${currentSemesterId}`);
      const data = await res.json();
      if (data && !data.error) {
        setRecords(data.records || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentSemesterId) {
      loadRecords();
    }
  }, [currentSemesterId]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      if (res.ok) loadRecords();
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

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">
              Sổ điểm rèn luyện cá nhân
            </h1>
            <p className="text-xs text-slate-500">
              Xem lại toàn bộ lịch sử điểm cộng và điểm trừ của học kỳ
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-huit-orange-500 hover:bg-huit-orange-600 text-white font-bold text-xs shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mục</span>
          </button>
        </div>

        <RecordList
          records={records}
          onDeleteRecord={handleDelete}
          onOpenAddModal={() => setModalOpen(true)}
        />
      </main>

      <AddRecordModal
        isOpen={modalOpen}
        semesterId={currentSemesterId}
        onClose={() => setModalOpen(false)}
        onSuccess={loadRecords}
      />

      <BottomNav />
    </div>
  );
}

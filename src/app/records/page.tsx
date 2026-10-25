"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { RecordList } from "@/components/records/RecordList";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { Plus, FileText } from "lucide-react";

export default function RecordsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DrlRecord | null>(null);
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
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-50 text-slate-900">
      <Header
        user={user}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
        onOpenNewSemesterModal={() => setNewSemesterModalOpen(true)}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Sổ ghi nhận điểm rèn luyện
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lịch sử các hoạt động cộng điểm và vi phạm theo học kỳ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/report?semesterId=${currentSemesterId}`}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất phiếu QĐ 3385</span>
            </Link>

            <button
              onClick={() => {
                setEditingRecord(null);
                setModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Ghi nhận mục mới</span>
            </button>
          </div>
        </div>

        <RecordList
          records={records}
          onDeleteRecord={handleDelete}
          onEditRecord={(r) => {
            setEditingRecord(r);
            setModalOpen(true);
          }}
          onOpenAddModal={() => {
            setEditingRecord(null);
            setModalOpen(true);
          }}
        />
      </main>

      <AddRecordModal
        isOpen={modalOpen}
        semesterId={currentSemesterId}
        recordToEdit={editingRecord}
        onClose={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={loadRecords}
      />

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

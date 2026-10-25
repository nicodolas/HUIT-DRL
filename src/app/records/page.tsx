"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineSyncBanner } from "@/components/common/OfflineSyncBanner";
import { RecordList } from "@/components/records/RecordList";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { CloneActivitiesModal } from "@/components/modals/CloneActivitiesModal";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { PreFlightAuditModal } from "@/components/modals/PreFlightAuditModal";
import { CsvExchangeModal } from "@/components/modals/CsvExchangeModal";
import { ExtracurricularDossierModal } from "@/components/dashboard/ExtracurricularDossierModal";
import { DeadlineAlertBanner } from "@/components/common/DeadlineAlertBanner";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { Plus, FileText, Copy, ShieldCheck, FileSpreadsheet, Award } from "lucide-react";

export default function RecordsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DrlRecord | null>(null);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [dossierModalOpen, setDossierModalOpen] = useState(false);

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

  const currentSemester = semesters.find((s) => s.id === currentSemesterId) || null;

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
              onClick={() => setDossierModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Xem trích lục hồ sơ hoạt động ngoại khóa A4"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Hồ sơ ngoại khóa</span>
            </button>

            {semesters.length > 1 && (
              <button
                onClick={() => setCloneModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                title="Sao chép các hoạt động thường niên từ học kỳ trước"
              >
                <Copy className="w-3.5 h-3.5 text-amber-500" />
                <span>Sao chép từ HK trước</span>
              </button>
            )}

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

      <CloneActivitiesModal
        isOpen={cloneModalOpen}
        currentSemesterId={currentSemesterId}
        semesters={semesters}
        onClose={() => setCloneModalOpen(false)}
        onSuccess={loadRecords}
      />

      <PreFlightAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        semester={currentSemester}
        records={records}
        onNavigateToReport={() => router.push(`/report?semesterId=${currentSemesterId}`)}
      />

      <CsvExchangeModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        semester={currentSemester}
        records={records}
        onImportComplete={loadRecords}
      />

      <ExtracurricularDossierModal
        isOpen={dossierModalOpen}
        onClose={() => setDossierModalOpen(false)}
        user={user}
        records={records}
        currentSemester={currentSemester}
      />

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => {
          setEditingRecord(null);
          setModalOpen(true);
        }}
        aria-label="Thêm hoạt động"
        className="sm:hidden fixed right-4 bottom-20 z-40 w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
      >
        <Plus className="w-5 h-5 text-amber-400" />
      </button>

      <BottomNav />
    </div>
  );
}

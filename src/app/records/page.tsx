"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { APP_FEATURES } from "@/lib/config/features";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { Plus, FileText, Copy, ShieldCheck, FileSpreadsheet, Award, ChevronDown, SlidersHorizontal } from "lucide-react";

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
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const handleUpdateAuditStatus = async (id: string, auditStatus: string, auditComment?: string) => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditStatus, auditComment }),
      });
      if (res.ok) loadRecords();
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  const currentSemester = semesters.find((s) => s.id === currentSemesterId) || null;

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sổ ghi nhận điểm rèn luyện
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Lịch sử các hoạt động cộng điểm và vi phạm theo học kỳ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Compact Utilities Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setToolsMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={toolsMenuOpen}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                title="Công cụ & Tiện ích xuất báo cáo"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Tiện ích</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${toolsMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {toolsMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1.5 z-30 animate-in fade-in duration-150"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setToolsMenuOpen(false);
                      setAuditModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-medium"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Kiểm tra hồ sơ</span>
                  </button>

                  <Link
                    href={`/report?semesterId=${currentSemesterId}`}
                    role="menuitem"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-medium"
                  >
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span>Xuất phiếu QĐ 3385</span>
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setToolsMenuOpen(false);
                      setCsvModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Xuất / Nhập Excel CSV</span>
                  </button>

                  {semesters.length > 1 && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setCloneModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-medium"
                    >
                      <Copy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>Sao chép từ HK trước</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Direct Extracurricular Dossier Button */}
            <button
              onClick={() => setDossierModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
              title="Xem trích lục hồ sơ hoạt động ngoại khóa A4"
            >
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Hồ sơ ngoại khóa</span>
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => {
                setEditingRecord(null);
                setModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
              <span>Ghi nhận mục mới</span>
            </button>
          </div>
        </div>

        {/* Semester Deadline & Status Banner (Administrative - guarded by feature flag) */}
        {APP_FEATURES.ENABLE_SUBMISSION_WORKFLOW && currentSemester && (
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
          studentName={user?.fullName}
          studentClass={user?.className}
          onDeleteRecord={handleDelete}
          onEditRecord={(r) => {
            setEditingRecord(r);
            setModalOpen(true);
          }}
          onOpenAddModal={() => {
            setEditingRecord(null);
            setModalOpen(true);
          }}
          onUpdateAuditStatus={handleUpdateAuditStatus}
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

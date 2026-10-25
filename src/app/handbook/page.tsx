"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { NewSemesterModal } from "@/components/modals/NewSemesterModal";
import { DrlCriteriaPreset, Semester } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Info,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function HandbookPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [presets, setPresets] = useState<DrlCriteriaPreset[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [typeFilter, setTypeFilter] = useState<"all" | "add" | "deduct">("all");
  const [search, setSearch] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPresetForModal, setSelectedPresetForModal] = useState<DrlCriteriaPreset | null>(null);
  const [newSemesterModalOpen, setNewSemesterModalOpen] = useState(false);

  useEffect(() => {
    // Load auth
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

    // Load 65 presets
    fetch("/api/presets")
      .then((res) => res.json())
      .then((data) => {
        if (data.presets) setPresets(data.presets);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const filteredPresets = presets.filter((p) => {
    if (selectedCategory > 0 && p.category !== selectedCategory) return false;
    if (typeFilter === "add" && Number(p.points) <= 0) return false;
    if (typeFilter === "deduct" && Number(p.points) >= 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = (p.title || "").toLowerCase().includes(q);
      const matchDesc = (p.description || "").toLowerCase().includes(q);
      const matchCode = (p.code || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCode) return false;
    }
    return true;
  });

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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Title & Institutional Intro */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-lg">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h1>Sổ tay Quy chế & Khung điểm Rèn luyện HUIT</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tra cứu chi tiết 65 mục tiêu chuẩn theo Quyết định số 3385/QĐ-DCT Trường Đại học Công Thương TP.HCM
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-900">{presets.length}</span> mục quy chế
            </div>
          </div>

          {/* Core Regulations Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
            {[1, 2, 3, 4, 5].map((c) => {
              const cat = CATEGORIES[c];
              return (
                <div
                  key={c}
                  onClick={() => setSelectedCategory(selectedCategory === c ? 0 : c)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedCategory === c
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-mono font-bold text-[10px] opacity-80">TC{c} (Trần {cat.maxPoints}đ)</div>
                  <div className="font-semibold text-[11px] truncate mt-0.5">{cat.name}</div>
                  <div className="text-[10px] mt-1 opacity-70">
                    {cat.defaultPoints > 0 ? `Sàn: ${cat.defaultPoints}đ` : "Không có sàn"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm nhanh: khám sức khỏe, BHYT, SHCD, hiến máu, NCKH, rớt môn, vi phạm thẻ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  typeFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả ({presets.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("add")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  typeFilter === "add"
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                Cộng điểm (+)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("deduct")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  typeFilter === "deduct"
                    ? "bg-red-700 text-white"
                    : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
                }`}
              >
                Trừ điểm (-)
              </button>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 px-1">
            Hiển thị {filteredPresets.length} mục quy định phù hợp:
          </div>

          {filteredPresets.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-dashed border-slate-300 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Không tìm thấy tiêu chí nào phù hợp</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hãy thử tìm kiếm với các từ khóa ngắn hơn như "khám", "BHYT", "CLB", "giải", "môn"...
              </p>
            </div>
          ) : (
            filteredPresets.map((p) => {
              const isAdd = Number(p.points) > 0;
              const isDefault = p.type === "default";
              const catMeta = CATEGORIES[p.category];

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 shadow-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {catMeta?.code || `TC${p.category}`}
                      </span>
                      {p.code && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {p.code}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-900">
                        {p.title}
                      </span>
                    </div>

                    {p.description && (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-medium">
                      <span>Đơn vị tính: <strong>{p.unit || "lần"}</strong></span>
                      <span>Trần tiêu chí: <strong>{p.maxPointsCategory}đ</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                        isDefault
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : isAdd
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {isDefault ? `Sàn: ${p.points}đ` : isAdd ? `+${p.points}đ` : `${p.points}đ`}
                    </span>

                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetForModal(p);
                          setModalOpen(true);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                        title="Thêm mục này vào sổ điểm học kỳ"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ghi nhận</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add Record Modal pre-populated with preset */}
      <AddRecordModal
        isOpen={modalOpen}
        semesterId={currentSemesterId}
        initialCategory={selectedPresetForModal?.category}
        onClose={() => {
          setModalOpen(false);
          setSelectedPresetForModal(null);
        }}
        onSuccess={() => {
          router.push("/records");
        }}
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


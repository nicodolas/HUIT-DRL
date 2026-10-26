"use client";

import React, { useState, useMemo } from "react";
import { DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import {
  Trash2,
  Calendar,
  FileText,
  Plus,
  Search,
  X,
  Edit3,
  Download,
  Image as ImageIcon,
  Check,
  Sparkles,
} from "lucide-react";
import { ProofViewerModal } from "@/components/modals/ProofViewerModal";
import { triggerHaptic } from "@/lib/native/platform";

interface RecordListProps {
  records: DrlRecord[];
  onDeleteRecord: (id: string) => void;
  onEditRecord?: (record: DrlRecord) => void;
  onOpenAddModal: () => void;
  studentName?: string;
  studentClass?: string;
  onUpdateAuditStatus?: (id: string, auditStatus: string, auditComment?: string) => Promise<void> | void;
}

export const RecordList: React.FC<RecordListProps> = ({
  records,
  onDeleteRecord,
  onEditRecord,
  onOpenAddModal,
  studentName,
  studentClass,
}) => {
  const [filterCat, setFilterCat] = useState<number>(0);
  const [filterType, setFilterType] = useState<"all" | "add" | "deduct" | "evidence" | "missing_evidence">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "points_desc">("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [viewingProofRecord, setViewingProofRecord] = useState<DrlRecord | null>(null);

  // Filtered & Sorted Records
  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (filterCat > 0 && r.category !== filterCat) return false;
        if (filterType === "add" && Number(r.points) <= 0) return false;
        if (filterType === "deduct" && Number(r.points) >= 0) return false;
        if (filterType === "evidence" && !r.evidenceUrl) return false;
        if (filterType === "missing_evidence" && !!r.evidenceUrl) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (r.title || "").toLowerCase().includes(q);
          const matchNote = (r.note || "").toLowerCase().includes(q);
          const matchDate = (r.occurredAt || "").toLowerCase().includes(q);
          if (!matchTitle && !matchNote && !matchDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          const dateA = a.occurredAt || a.createdAt;
          const dateB = b.occurredAt || b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }
        if (sortBy === "oldest") {
          const dateA = a.occurredAt || a.createdAt;
          const dateB = b.occurredAt || b.createdAt;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        }
        if (sortBy === "points_desc") {
          return Number(b.points) * (b.quantity || 1) - Number(a.points) * (a.quantity || 1);
        }
        return 0;
      });
  }, [records, filterCat, filterType, sortBy, searchQuery]);

  // Export clean CSV
  const exportToCsv = () => {
    if (records.length === 0) return;
    const headers = ["STT", "Tiêu chí", "Tên hoạt động", "Điểm", "Số lượng", "Tổng điểm", "Ngày diễn ra", "Ghi chú"];
    const rows = records.map((r, idx) => {
      const totalPts = Number(r.points) * (r.quantity || 1);
      return [
        idx + 1,
        `"TC${r.category} - ${CATEGORIES[r.category]?.name || ""}"`,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        r.points,
        r.quantity || 1,
        totalPts,
        `"${r.occurredAt || ""}"`,
        `"${(r.note || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SoTay_DRL_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Nhật ký hoạt động</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {records.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sổ ghi chép các hoạt động phong trào, học thuật và ý thức rèn luyện cá nhân
          </p>
        </div>

        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <>
              {/* View Switcher */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Danh sách
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    viewMode === "timeline"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Thời gian
                </button>
              </div>

              {/* Export CSV */}
              <button
                onClick={exportToCsv}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Tải bảng tính CSV cá nhân"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xuất bảng tính</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              triggerHaptic("medium");
              onOpenAddModal();
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
            <span>Thêm</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterCat(0)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filterCat === 0
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Tất cả ({records.length})
        </button>
        {[1, 2, 3, 4, 5].map((c) => {
          const catMeta = CATEGORIES[c];
          const count = records.filter((r) => r.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1.5 ${
                filterCat === c
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>{catMeta.code}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">{catMeta.shortName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterCat === c ? "bg-white/20 dark:bg-black/20" : "bg-slate-200 dark:bg-slate-700"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Sub-Filter Toolbar */}
      {records.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động theo tên, ngày, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl px-2.5 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Mọi loại điểm</option>
              <option value="add">Điểm cộng (+)</option>
              <option value="deduct">Điểm trừ (-)</option>
              <option value="evidence">Có ảnh minh chứng</option>
              <option value="missing_evidence">Chưa có ảnh</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl px-2.5 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="points_desc">Điểm cao nhất</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty State */}
      {records.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 shadow-2xs">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Sổ tay học kỳ này đang trống
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Bạn đã có sẵn <strong>60 điểm mặc định</strong> (TC1: 25đ, TC2: 20đ, TC4: 15đ). Hãy bắt đầu ghi chép các hoạt động phong trào, NCKH hoặc khen thưởng để nâng hạng điểm!
          </p>
          <button
            onClick={() => {
              triggerHaptic("medium");
              onOpenAddModal();
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950" />
            <span>Ghi chép hoạt động đầu tiên</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Không tìm thấy hoạt động nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        /* Records List / Timeline */
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const cat = CATEGORIES[r.category] || { code: `TC${r.category}`, shortName: "Khác", color: "#64748b" };
            const isAdd = Number(r.points) > 0;
            const totalPts = Number(r.points) * (r.quantity || 1);

            return (
              <div
                key={r.id}
                className="group relative bg-white dark:bg-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-700/80 transition-all shadow-2xs hover:shadow-xs flex items-start gap-3 sm:gap-4"
              >
                {/* Category Pill Tag */}
                <div
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white font-bold text-[10px] shadow-2xs"
                  style={{ backgroundColor: cat.color }}
                  title={`${cat.code} - ${cat.shortName}`}
                >
                  <span>{cat.code}</span>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                      {r.title}
                    </h4>

                    {/* Score Tag */}
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                          isAdd
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {isAdd ? `+${totalPts}` : totalPts}đ
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{cat.shortName}</span>

                    {r.occurredAt && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{r.occurredAt}</span>
                      </span>
                    )}

                    {r.quantity && r.quantity > 1 && (
                      <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded text-[10px]">
                        x{r.quantity} lần ({r.points}đ/lần)
                      </span>
                    )}

                    {/* Proof Indicator */}
                    {r.evidenceUrl ? (
                      <button
                        type="button"
                        onClick={() => setViewingProofRecord(r)}
                        className="inline-flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                        title="Bấm để xem ảnh minh chứng"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Có minh chứng</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Chưa đính kèm ảnh</span>
                    )}
                  </div>

                  {/* Personal Note */}
                  {r.note && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 rounded-lg p-2 mt-1 border border-slate-100 dark:border-slate-800/80">
                      {r.note}
                    </p>
                  )}
                </div>

                {/* Action Buttons: Edit / Delete */}
                <div className="flex items-center space-x-1 shrink-0 self-center">
                  {onEditRecord && (
                    <button
                      onClick={() => {
                        triggerHaptic("light");
                        onEditRecord(r);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Sửa hoạt động"
                      aria-label="Sửa hoạt động"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa hoạt động "${r.title}" khỏi sổ tay?`)) {
                        triggerHaptic("medium");
                        onDeleteRecord(r.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Xóa hoạt động"
                    aria-label="Xóa hoạt động"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Proof Viewer Modal */}
      {viewingProofRecord && (
        <ProofViewerModal
          isOpen={!!viewingProofRecord}
          onClose={() => setViewingProofRecord(null)}
          record={viewingProofRecord}
        />
      )}
    </div>
  );
};

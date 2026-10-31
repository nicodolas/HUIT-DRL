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
  QrCode,
  Share2,
} from "lucide-react";
import { ProofViewerModal } from "@/components/modals/ProofViewerModal";
import { ActivityVerificationModal } from "@/components/records/ActivityVerificationModal";
import { triggerHaptic } from "@/lib/native/platform";
import { parseEventDateTime } from "@/lib/calendar/utils";

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

interface RecordListProps {
  records: DrlRecord[];
  onDeleteRecord: (id: string) => void;
  onEditRecord?: (record: DrlRecord) => void;
  onOpenShareModal?: (record: DrlRecord) => void;
  onOpenAddModal: () => void;
  studentName?: string;
  studentClass?: string;
  onUpdateAuditStatus?: (id: string, auditStatus: string, auditComment?: string) => Promise<void> | void;
}

export const RecordList: React.FC<RecordListProps> = ({
  records,
  onDeleteRecord,
  onEditRecord,
  onOpenShareModal,
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
  const [verifyingRecord, setVerifyingRecord] = useState<DrlRecord | null>(null);

  // Filtered & Sorted Records
  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (filterCat > 0 && r.category !== filterCat) return false;
        if (filterType === "add" && Number(r.points) <= 0) return false;
        if (filterType === "deduct" && Number(r.points) >= 0) return false;
        if (filterType === "evidence" && (!r.evidenceUrl || !r.evidenceUrl.trim())) return false;
        if (filterType === "missing_evidence" && (r.evidenceUrl && r.evidenceUrl.trim() !== "")) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const qNorm = removeVietnameseTones(q);

          // 1. Title match (both accented and unaccented)
          const titleStr = r.title || "";
          const matchTitle =
            titleStr.toLowerCase().includes(q) ||
            removeVietnameseTones(titleStr).includes(qNorm);

          // 2. Note match (both accented and unaccented)
          const noteStr = r.note || "";
          const matchNote =
            noteStr.toLowerCase().includes(q) ||
            removeVietnameseTones(noteStr).includes(qNorm);

          // 3. Category match (code "TC1", "TC 1", and name)
          const catMeta = CATEGORIES[r.category];
          const matchCategory = catMeta
            ? catMeta.code.toLowerCase().includes(q) ||
              catMeta.code.toLowerCase().replace(/tc/i, "tc ").includes(q) ||
              catMeta.name.toLowerCase().includes(q) ||
              removeVietnameseTones(catMeta.name).includes(qNorm)
            : false;

          // 4. Date match (supports YYYY-MM-DD, DD/MM/YYYY, DD/MM, DD-MM-YYYY, DD-MM, MM/YYYY)
          let matchDate = false;
          if (r.occurredAt) {
            const rawDate = r.occurredAt.toLowerCase();
            if (rawDate.includes(q)) {
              matchDate = true;
            } else {
              const parts = r.occurredAt.split("-");
              if (parts.length === 3) {
                const [year, month, day] = parts;
                const vnSlashFull = `${day}/${month}/${year}`;
                const vnSlashShort = `${day}/${month}`;
                const vnHyphenFull = `${day}-${month}-${year}`;
                const vnHyphenShort = `${day}-${month}`;
                const monthYearSlash = `${month}/${year}`;
                if (
                  vnSlashFull.includes(q) ||
                  vnSlashShort.includes(q) ||
                  vnHyphenFull.includes(q) ||
                  vnHyphenShort.includes(q) ||
                  monthYearSlash.includes(q)
                ) {
                  matchDate = true;
                }
              }
            }
          }

          if (!matchTitle && !matchNote && !matchDate && !matchCategory) return false;
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
      {records.length > 0 && (
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
      )}

      {/* Search & Sub-Filter Toolbar */}
      {records.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoạt động, ngày, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              aria-label="Bộ lọc trạng thái"
              className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl px-2.5 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="add">Cộng điểm</option>
              <option value="deduct">Điểm trừ</option>
              <option value="evidence">Có minh chứng</option>
              <option value="missing_evidence">Thiếu minh chứng</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              aria-label="Sắp xếp danh sách"
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
        <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {searchQuery.trim()
              ? `Không tìm thấy hoạt động nào phù hợp với từ khóa '${searchQuery.trim()}'`
              : "Không tìm thấy hoạt động nào phù hợp với bộ lọc hiện tại"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
            Hãy thử kiểm tra lại từ khóa tìm kiếm hoặc bấm nút bên dưới để khôi phục toàn bộ danh sách hoạt động.
          </p>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setSearchQuery("");
              setFilterCat(0);
              setFilterType("all");
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa bộ lọc</span>
          </button>
        </div>
      ) : (
        /* Records List / Timeline */
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const cat = CATEGORIES[r.category] || { code: `TC${r.category}`, shortName: "Khác", color: "#64748b" };
            const isAdd = Number(r.points) > 0;
            const totalPts = Number(r.points) * (r.quantity || 1);
            const eventTime = parseEventDateTime(r.occurredAt);
            const isFuture = eventTime ? eventTime.isFuture : false;

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
                          isFuture
                            ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-dashed border-sky-300 dark:border-sky-700"
                            : isAdd
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {isFuture ? `Dự kiến ${totalPts > 0 ? "+" : ""}${totalPts}đ` : isAdd ? `+${totalPts}đ` : `${totalPts}đ`}
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

                    {eventTime?.isToday && (
                      <span className="bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Hôm nay
                      </span>
                    )}
                    {eventTime?.isTomorrow && (
                      <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Ngày mai
                      </span>
                    )}
                    {eventTime?.isFuture && !eventTime?.isTomorrow && (
                      <span className="bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Còn {eventTime.daysDiff} ngày
                      </span>
                    )}

                    {r.quantity && r.quantity > 1 && (
                      <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded text-[10px]">
                        x{r.quantity} lần ({r.points}đ/lần)
                      </span>
                    )}

                    {/* Proof Indicator */}
                    {r.originCreatorUsername && (
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold"
                        title={`Mã mời: ${r.originInviteCode || "HUIT"}`}
                      >
                        Nhận từ @{r.originCreatorUsername}
                      </span>
                    )}

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
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] font-medium" title="Hoạt động chưa có link hoặc ảnh minh chứng">
                        Chưa có minh chứng
                      </span>
                    )}
                  </div>

                  {/* Personal Note */}
                  {r.note && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 rounded-lg p-2 mt-1 border border-slate-100 dark:border-slate-800/80">
                      {r.note}
                    </p>
                  )}
                </div>

                {/* Action Buttons: QR Verify / Edit / Delete */}
                <div className="flex items-center space-x-1 shrink-0 self-center">
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      setVerifyingRecord(r);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                    title="Mã QR & Thẻ xác nhận"
                    aria-label="Mã QR & Thẻ xác nhận"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  {onOpenShareModal && (
                    <button
                      onClick={() => {
                        triggerHaptic("light");
                        onOpenShareModal(r);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      title="Chia sẻ mã mời cho bạn bè"
                      aria-label="Chia sẻ mã mời"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}

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

      {/* Activity Verification QR Modal */}
      {verifyingRecord && (
        <ActivityVerificationModal
          isOpen={!!verifyingRecord}
          onClose={() => setVerifyingRecord(null)}
          record={verifyingRecord}
          studentName={studentName}
          studentClass={studentClass}
        />
      )}
    </div>
  );
};

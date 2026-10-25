"use client";

import React, { useState, useMemo } from "react";
import { DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { Trash2, Calendar, FileText, Layers, Plus, Search, X, Edit3, Download, ExternalLink, Clock } from "lucide-react";

interface RecordListProps {
  records: DrlRecord[];
  onDeleteRecord: (id: string) => void;
  onEditRecord?: (record: DrlRecord) => void;
  onOpenAddModal: () => void;
}

export const RecordList: React.FC<RecordListProps> = ({
  records,
  onDeleteRecord,
  onEditRecord,
  onOpenAddModal,
}) => {
  const [filterCat, setFilterCat] = useState<number>(0);
  const [filterType, setFilterType] = useState<"all" | "add" | "deduct" | "evidence" | "missing_evidence">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "points_desc">("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  const addCount = records.filter((r) => Number(r.points) > 0).length;
  const deductCount = records.filter((r) => Number(r.points) < 0).length;
  const evidenceCount = records.filter((r) => !!r.evidenceUrl).length;
  const missingEvidenceCount = records.filter((r) => !r.evidenceUrl).length;
  const evidencePercent = records.length > 0 ? Math.round((evidenceCount / records.length) * 100) : 100;

  const filtered = records
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
      if (sortBy === "points_desc") {
        return Number(b.points) * (b.quantity || 1) - Number(a.points) * (a.quantity || 1);
      }
      if (sortBy === "oldest") {
        return (a.occurredAt || "").localeCompare(b.occurredAt || "");
      }
      // newest
      return (b.occurredAt || "").localeCompare(a.occurredAt || "");
    });

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, DrlRecord[]> = {};
    for (const r of filtered) {
      let key = "Khác / Chưa rõ ngày";
      if (r.occurredAt && r.occurredAt.includes("-")) {
        const parts = r.occurredAt.split("-");
        if (parts.length >= 2) {
          key = `Tháng ${parts[1]}/${parts[0]}`;
        }
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [filtered]);

  const exportToCsv = () => {
    if (records.length === 0) return;
    const headers = [
      "STT",
      "Tiêu chí",
      "Tên hoạt động",
      "Phân loại",
      "Điểm mỗi lần",
      "Số lượng",
      "Tổng điểm",
      "Ngày diễn ra",
      "Ghi chú",
      "Link minh chứng",
    ];

    const rows = records.map((r, idx) => {
      const isAdd = Number(r.points) > 0;
      const totalPts = Number(r.points) * (r.quantity || 1);
      return [
        idx + 1,
        `"TC${r.category} - ${CATEGORIES[r.category]?.name || ""}"`,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        isAdd ? "Cộng điểm" : "Trừ điểm",
        r.points,
        r.quantity || 1,
        totalPts,
        `"${r.occurredAt || ""}"`,
        `"${(r.note || "").replace(/"/g, '""')}"`,
        `"${(r.evidenceUrl || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `HUIT_DRL_HoatDong_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Nhật ký ghi nhận điểm ({records.length})
          </h2>
          <p className="text-xs text-slate-500">
            Các hoạt động cộng điểm và vi phạm trong học kỳ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {records.length > 0 && (
            <div className="flex items-center space-x-1">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Danh sách
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    viewMode === "timeline"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Dòng thời gian
                </button>
              </div>

              <button
                onClick={exportToCsv}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Xuất bảng Excel/CSV nộp ban cán sự"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Xuất CSV</span>
              </button>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCat(0)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterCat === 0
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả
          </button>
          {[1, 2, 3, 4, 5].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterCat === c
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              TC {c}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      {records.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Quick Search Bar */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo tên hoạt động, ngày hoặc ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
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

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none cursor-pointer font-medium"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="points_desc">Điểm cao nhất</option>
            </select>
          </div>

          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({records.length})
            </button>
            <button
              onClick={() => setFilterType("add")}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === "add"
                  ? "bg-emerald-800 text-white"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Cộng điểm ({addCount})
            </button>
            <button
              onClick={() => setFilterType("deduct")}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === "deduct"
                  ? "bg-red-800 text-white"
                  : "bg-red-50 text-red-800 hover:bg-red-100"
              }`}
            >
              Trừ điểm ({deductCount})
            </button>
            {evidenceCount > 0 && (
              <button
                onClick={() => setFilterType("evidence")}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filterType === "evidence"
                    ? "bg-blue-800 text-white"
                    : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                }`}
              >
                Có minh chứng ({evidenceCount})
              </button>
            )}
            {missingEvidenceCount > 0 && evidenceCount > 0 && (
              <button
                onClick={() => setFilterType("missing_evidence")}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filterType === "missing_evidence"
                    ? "bg-amber-800 text-white"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                Chưa có link ({missingEvidenceCount})
              </button>
            )}
          </div>

          {/* Evidence Audit Status Bar */}
          <div className="flex items-center justify-between p-2 rounded-lg border text-xs bg-slate-50 border-slate-200">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  missingEvidenceCount === 0 ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="text-slate-700 text-[11px]">
                Kiểm kê minh chứng: <strong>{`${evidenceCount}/${records.length}`}</strong> mục đã gắn link ({evidencePercent}%).
                {missingEvidenceCount > 0 ? (
                  <span className="text-amber-700 font-medium ml-1">
                    Còn {missingEvidenceCount} mục chưa có link Drive.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium ml-1">
                    100% mục đã đủ minh chứng!
                  </span>
                )}
              </span>
            </div>
            {missingEvidenceCount > 0 && filterType !== "missing_evidence" && (
              <button
                onClick={() => setFilterType("missing_evidence")}
                className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer shrink-0 ml-2"
              >
                Lọc mục thiếu &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mb-2.5">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-semibold text-slate-700">
            Chưa có mục ghi nhận nào trong danh mục này
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
            Điểm mặc định (60đ) đã được tính sẵn. Hãy ghi nhận các hoạt động tham gia để nâng cao điểm rèn luyện.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-3 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            + Ghi nhận hoạt động
          </button>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = CATEGORIES[r.category] || CATEGORIES[1];
            const isAdd = Number(r.points) > 0;
            const totalItemPoints = Number(r.points) * (r.quantity || 1);

            return (
              <div
                key={r.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {meta.code}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-900 leading-snug truncate">
                      {r.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                    {r.occurredAt && (
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        {r.occurredAt}
                      </span>
                    )}
                    {r.quantity && r.quantity > 1 && (
                      <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">
                        x{r.quantity}
                      </span>
                    )}
                    {r.note && (
                      <span className="flex items-center text-slate-500 italic truncate max-w-xs">
                        <FileText className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                        {r.note}
                      </span>
                    )}
                    {r.evidenceUrl && (() => {
                      const lower = r.evidenceUrl.toLowerCase();
                      let label = "Minh chứng";
                      let colorClass = "bg-slate-100 text-slate-700 border-slate-200";

                      if (lower.includes("drive.google.com") || lower.includes("docs.google.com")) {
                        label = "Google Drive";
                        colorClass = "bg-blue-50 text-blue-700 border-blue-200";
                      } else if (lower.includes("1drv.ms") || lower.includes("onedrive") || lower.includes("sharepoint")) {
                        label = "OneDrive";
                        colorClass = "bg-sky-50 text-sky-700 border-sky-200";
                      } else if (lower.includes("facebook.com") || lower.includes("fb.com")) {
                        label = "Facebook";
                        colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                      }

                      return (
                        <a
                          href={r.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium border hover:opacity-80 transition-opacity ${colorClass}`}
                          title="Mở liên kết minh chứng"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span>{label}</span>
                        </a>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      isAdd
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {isAdd ? `+${totalItemPoints}` : totalItemPoints}đ
                  </span>

                  {onEditRecord && (
                    <button
                      onClick={() => onEditRecord(r)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Sửa mục này"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa "${r.title}"?`)) {
                        onDeleteRecord(r.id);
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Xóa mục này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Monthly Timeline View */
        <div className="space-y-6 pt-2">
          {Object.entries(groupedByMonth).map(([month, monthRecords]) => {
            const netPoints = monthRecords.reduce(
              (sum, r) => sum + Number(r.points) * (r.quantity || 1),
              0
            );

            return (
              <div key={month} className="space-y-2.5">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shrink-0" />
                  <h4 className="font-bold text-xs text-slate-900">{month}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({monthRecords.length} hoạt động)
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ml-auto ${
                      netPoints >= 0
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {netPoints >= 0 ? `+${netPoints}` : netPoints}đ
                  </span>
                </div>

                <div className="border-l-2 border-slate-200 ml-1 pl-3.5 space-y-2">
                  {monthRecords.map((r) => {
                    const meta = CATEGORIES[r.category] || CATEGORIES[1];
                    const isAdd = Number(r.points) > 0;
                    const totalItemPoints = Number(r.points) * (r.quantity || 1);

                    return (
                      <div
                        key={r.id}
                        className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {meta.code}
                            </span>
                            <h3 className="text-xs font-semibold text-slate-900 leading-snug truncate">
                              {r.title}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                            {r.occurredAt && (
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                                {r.occurredAt}
                              </span>
                            )}
                            {r.quantity && r.quantity > 1 && (
                              <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">
                                x{r.quantity}
                              </span>
                            )}
                            {r.note && (
                              <span className="flex items-center text-slate-500 italic truncate max-w-xs">
                                <FileText className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                                {r.note}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                              isAdd
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {isAdd ? `+${totalItemPoints}` : totalItemPoints}đ
                          </span>

                          {onEditRecord && (
                            <button
                              onClick={() => onEditRecord(r)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Sửa mục này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa "${r.title}"?`)) {
                                onDeleteRecord(r.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa mục này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

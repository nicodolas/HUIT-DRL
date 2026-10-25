"use client";

import React, { useState } from "react";
import { DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { Trash2, Calendar, FileText, Layers, Plus } from "lucide-react";

interface RecordListProps {
  records: DrlRecord[];
  onDeleteRecord: (id: string) => void;
  onOpenAddModal: () => void;
}

export const RecordList: React.FC<RecordListProps> = ({
  records,
  onDeleteRecord,
  onOpenAddModal,
}) => {
  const [filterCat, setFilterCat] = useState<number>(0);

  const filtered = records.filter((r) => {
    if (filterCat > 0 && r.category !== filterCat) return false;
    return true;
  });

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
      ) : (
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
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      isAdd
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {isAdd ? `+${totalItemPoints}` : totalItemPoints}đ
                  </span>

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
      )}
    </div>
  );
};

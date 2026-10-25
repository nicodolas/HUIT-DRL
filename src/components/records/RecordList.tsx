"use client";

import React, { useState } from "react";
import { DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { Trash2, Calendar, FileText, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

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
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            Nhật ký ghi nhận điểm ({records.length})
          </h2>
          <p className="text-xs text-slate-500">
            Danh sách các hoạt động cộng điểm và vi phạm trong học kỳ
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCat(0)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
              filterCat === 0
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả
          </button>
          {[1, 2, 3, 4, 5].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                filterCat === c
                  ? "bg-huit-blue-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              TC {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center p-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-huit-blue-600 flex items-center justify-center mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            Chưa có mục điểm nào trong danh mục này
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Bạn đã có sẵn 60 điểm mặc định (TC 1, 2, 4). Hãy thêm các hoạt động để nâng điểm rèn luyện!
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-4 px-4 py-2 rounded-xl bg-huit-blue-700 hover:bg-huit-blue-800 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            + Thêm hoạt động ngay
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const meta = CATEGORIES[r.category] || CATEGORIES[1];
            const isAdd = Number(r.points) > 0;
            const totalItemPoints = Number(r.points) * (r.quantity || 1);

            return (
              <div
                key={r.id}
                className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all flex items-start justify-between gap-3 shadow-2xs"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-black text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.code}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      {r.title}
                    </h3>
                  </div>

                  {/* Metadata: Date, Note, Quantity */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                    {r.occurredAt && (
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        {r.occurredAt}
                      </span>
                    )}
                    {r.quantity && r.quantity > 1 && (
                      <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        Số lượng: x{r.quantity}
                      </span>
                    )}
                    {r.note && (
                      <span className="flex items-center text-slate-600 italic">
                        <FileText className="w-3 h-3 mr-1 text-slate-400" />
                        {r.note}
                      </span>
                    )}
                  </div>
                </div>

                {/* Points pill & Delete button */}
                <div className="flex items-center space-x-2 shrink-0">
                  <div
                    className={`px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                      isAdd
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {isAdd ? `+${totalItemPoints}` : totalItemPoints}đ
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa "${r.title}"?`)) {
                        onDeleteRecord(r.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa mục này"
                  >
                    <Trash2 className="w-4 h-4" />
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

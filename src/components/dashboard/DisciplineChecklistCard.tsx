"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { triggerHaptic } from "@/lib/native/platform";

interface ChecklistItem {
  id: string;
  title: string;
  penaltyText: string;
  category: number;
}

const DISCIPLINE_ITEMS: ChecklistItem[] = [
  {
    id: "shcd",
    title: "Tham gia đầy đủ tuần Sinh hoạt công dân sinh viên (SHCD)",
    penaltyText: "Không đi bị trừ 5 điểm (TC1)",
    category: 1,
  },
  {
    id: "kham_suc_khoe",
    title: "Khám sức khỏe định kỳ theo thông báo của Trạm Y tế Trường",
    penaltyText: "Không đi bị trừ 5 điểm (TC1)",
    category: 1,
  },
  {
    id: "bhyt",
    title: "Hoàn thành nghĩa vụ tham gia Bảo hiểm y tế (BHYT) sinh viên",
    penaltyText: "Không có bị trừ 5 điểm (TC1)",
    category: 1,
  },
  {
    id: "the_sinh_vien",
    title: "Đeo thẻ sinh viên và mặc đồng phục/trang phục lịch sự khi đến trường",
    penaltyText: "Vi phạm bị trừ 5 điểm (TC1)",
    category: 1,
  },
  {
    id: "ngoai_tru",
    title: "Cập nhật đầy đủ thông tin sinh viên ngoại trú trên cổng trường",
    penaltyText: "Không cập nhật bị trừ 5 điểm (TC1)",
    category: 1,
  },
  {
    id: "khao_sat",
    title: "Hoàn thành các bài khảo sát đánh giá của Khoa và Nhà trường",
    penaltyText: "Bỏ sót bị trừ 5 điểm (TC1)",
    category: 1,
  },
  {
    id: "khong_vang_hoat_dong",
    title: "Tham gia đầy đủ các cuộc thi/sự kiện đã đăng ký tham gia",
    penaltyText: "Đăng ký mà vắng mặt bị trừ 5 điểm/lần (TC3)",
    category: 3,
  },
  {
    id: "hoc_tap_tot",
    title: "Ý thức học tập nghiêm túc, không để thi rớt môn học",
    penaltyText: "Rớt 1 môn trừ 2đ, rớt 2-5 môn trừ 5đ (TC2)",
    category: 2,
  },
];

interface DisciplineChecklistCardProps {
  semesterId: string;
}

export const DisciplineChecklistCard: React.FC<DisciplineChecklistCardProps> = ({ semesterId }) => {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && semesterId) {
      try {
        const key = `huit_discipline_checklist_${semesterId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          setCompletedIds(JSON.parse(saved));
        } else {
          // Defaults for fresh semesters: healthy defaults
          setCompletedIds(["the_sinh_vien", "bhyt"]);
        }
      } catch {
        // Fallback
      }
    }
  }, [semesterId]);

  const toggleItem = (id: string) => {
    triggerHaptic("light");
    const next = completedIds.includes(id)
      ? completedIds.filter((i) => i !== id)
      : [...completedIds, id];
    setCompletedIds(next);

    if (typeof window !== "undefined" && semesterId) {
      localStorage.setItem(`huit_discipline_checklist_${semesterId}`, JSON.stringify(next));
    }
  };

  const total = DISCIPLINE_ITEMS.length;
  const count = completedIds.length;
  const isAllDone = count === total;

  if (!mounted) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Sổ Nhắc Phòng Ngừa Vi Phạm & Điểm Trừ
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Điều 5.1 & 5.2
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Danh mục kiểm tra các nghĩa vụ bắt buộc để bảo toàn trọn vẹn 60 điểm sàn có sẵn
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={isExpanded ? "Thu gọn sổ nhắc" : "Mở rộng sổ nhắc"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Progress pill */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="font-medium text-slate-600 dark:text-slate-400">
          Tiến độ phòng ngừa: <strong className="text-slate-900 dark:text-slate-100">{count}/{total} việc đã hoàn thành</strong>
        </span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
          isAllDone
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
        }`}>
          {isAllDone ? "An toàn 60 điểm sàn" : `Còn ${total - count} việc cần chú ý`}
        </span>
      </div>

      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          style={{ width: `${(count / total) * 100}%` }}
          className={`h-full transition-all duration-300 ${
            isAllDone ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {DISCIPLINE_ITEMS.map((item) => {
            const checked = completedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-2.5 rounded-xl border text-xs flex items-start space-x-2.5 transition-all cursor-pointer select-none ${
                  checked
                    ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                    : "bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/60 text-slate-900 dark:text-slate-100 hover:bg-amber-50/30"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold leading-snug ${checked ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                    {item.title}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${checked ? "text-slate-400 dark:text-slate-500" : "text-amber-700 dark:text-amber-400 font-medium"}`}>
                    {item.penaltyText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

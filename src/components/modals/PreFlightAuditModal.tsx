"use client";

import React from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
  Award,
  Info,
} from "lucide-react";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { calculateSemesterScore } from "@/lib/drl/calculator";
import { CATEGORIES, DisciplineLevel } from "@/lib/drl/rules";

interface PreFlightAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  semester: Semester | null;
  records: DrlRecord[];
  onNavigateToReport?: () => void;
}

export const PreFlightAuditModal: React.FC<PreFlightAuditModalProps> = ({
  isOpen,
  onClose,
  semester,
  records,
  onNavigateToReport,
}) => {
  if (!isOpen || !semester) return null;

  const scoreResult = calculateSemesterScore(
    records,
    (semester.disciplineLevel as DisciplineLevel) || "none"
  );

  // 1. Audit missing evidence
  const nonDefaultRecords = records.filter((r) => r.type !== "default");
  const missingEvidenceRecords = nonDefaultRecords.filter(
    (r) => !r.evidenceUrl || !r.evidenceUrl.trim()
  );
  const evidencePercent =
    nonDefaultRecords.length > 0
      ? Math.round(
          ((nonDefaultRecords.length - missingEvidenceRecords.length) /
            nonDefaultRecords.length) *
            100
        )
      : 100;

  // 2. Audit category overflow
  const overflowCategories: {
    category: number;
    name: string;
    raw: number;
    max: number;
    lost: number;
  }[] = [];

  for (let c = 1; c <= 5; c++) {
    const catResult = scoreResult.categories[c];
    if (catResult && catResult.rawScore > catResult.maxPoints) {
      overflowCategories.push({
        category: c,
        name: CATEGORIES[c].shortName,
        raw: catResult.rawScore,
        max: catResult.maxPoints,
        lost: catResult.rawScore - catResult.maxPoints,
      });
    }
  }

  // 3. Discipline cap
  const hasDiscipline = semester.disciplineLevel && semester.disciplineLevel !== "none";

  // 4. Calculate Readiness Index (0 - 100)
  let readiness = 100;
  if (missingEvidenceRecords.length > 0) readiness -= Math.min(40, missingEvidenceRecords.length * 15);
  if (scoreResult.totalScore < 50) readiness -= 30;
  else if (scoreResult.totalScore < 70) readiness -= 15;
  if (hasDiscipline) readiness -= 10;
  readiness = Math.max(0, Math.min(100, readiness));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Kiểm Tra Hồ Sơ Trước Khi Nộp</h2>
              <p className="text-xs text-slate-300">
                Chẩn đoán tính hợp lệ theo Quy chế 3385/QĐ-DCT ({semester.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Readiness Score Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              readiness >= 85
                ? "bg-emerald-50 border-emerald-200"
                : readiness >= 60
                ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Độ Sẵn Sàng Hồ Sơ
              </div>
              <div className="flex items-baseline space-x-2 mt-1">
                <span
                  className={`text-3xl font-black ${
                    readiness >= 85
                      ? "text-emerald-700"
                      : readiness >= 60
                      ? "text-amber-700"
                      : "text-red-700"
                  }`}
                >
                  {readiness}%
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {readiness >= 85
                    ? "Hồ sơ chuẩn chỉ, sẵn sàng nộp cho Lớp trưởng"
                    : readiness >= 60
                    ? "Có thể nộp nhưng nên hoàn thiện minh chứng còn thiếu"
                    : "Cần bổ sung minh chứng và rà soát lại trước khi nộp"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-right">
                <div className="text-[11px] text-slate-500">Điểm tự đánh giá</div>
                <div className="text-xl font-bold text-slate-900">
                  {scoreResult.totalScore} / 100
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-xs">
                {scoreResult.rating.label}
              </div>
            </div>
          </div>

          {/* Diagnostic 1: Evidence completeness */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {missingEvidenceRecords.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">
                  1. Minh Chứng Hoạt Động Ngoại Khóa ({evidencePercent}%)
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {nonDefaultRecords.length - missingEvidenceRecords.length}/{nonDefaultRecords.length} đã có link
              </span>
            </div>

            {missingEvidenceRecords.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                Tuyệt vời! Toàn bộ {nonDefaultRecords.length} hoạt động cộng điểm của bạn đều đã có link minh chứng (Google Drive / hình ảnh). Ban cán sự và Thư ký lớp sẽ dễ dàng phê duyệt.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  Có <strong>{missingEvidenceRecords.length} hoạt động</strong> chưa gắn link ảnh minh chứng. Theo Điều 13, nếu không có minh chứng, Ban cán sự lớp có thể trừ hoặc loại bỏ điểm này khi họp xét:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {missingEvidenceRecords.map((r) => (
                    <div
                      key={r.id}
                      className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800 truncate max-w-xs">
                        {r.title}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px] shrink-0 ml-2">
                        +{r.points}đ (TC{r.category})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Diagnostic 2: Category caps */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {overflowCategories.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">
                  2. Khống Chế Điểm Trần Từng Tiêu Chí
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                {overflowCategories.length === 0 ? "Tối ưu" : `${overflowCategories.length} tiêu chí tràn khung`}
              </span>
            </div>

            {overflowCategories.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                Các tiêu chí đều nằm trong hạn mức điểm trần của nhà trường, không có điểm tích lũy nào bị lãng phí.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                  Theo Quy chế HUIT, điểm từng tiêu chí không được vượt mức trần quy định. Điểm vượt trần sẽ không được bù sang tiêu chí khác:
                </p>
                <div className="space-y-1.5">
                  {overflowCategories.map((ov) => (
                    <div
                      key={ov.category}
                      className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">
                        TC {ov.category} ({ov.name})
                      </span>
                      <span className="text-slate-600 text-[11px]">
                        Đạt <strong>{ov.raw}đ</strong> / Trần {ov.max}đ (Dư{" "}
                        <span className="text-amber-600 font-bold">+{ov.lost}đ</span>)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Diagnostic 3: Baseline & Discipline */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                3. Điều Kiện Kỷ Luật & Khởi Điểm
              </h3>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Khởi điểm mặc định (60đ):</span>
                <span className="font-bold text-slate-900">TC1: 25đ | TC2: 20đ | TC4: 15đ</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Tình trạng kỷ luật học kỳ:</span>
                <span
                  className={`font-bold ${
                    hasDiscipline ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {hasDiscipline
                    ? `${semester.disciplineLevel} (Xếp loại thực tế: ${scoreResult.rating.label})`
                    : "Không vi phạm (Đủ điều kiện xếp Xuất sắc)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center space-x-2">
            {onNavigateToReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToReport();
                }}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Xem & In Form 01</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

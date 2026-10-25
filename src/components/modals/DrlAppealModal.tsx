"use client";

import React, { useState } from "react";
import { X, FileQuestion, Printer, Check, Copy, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import { DrlAppealData, HUIT_APPEAL_PRESETS } from "@/lib/appeal/types";
import { formatHuitAppealText } from "@/lib/appeal/templates";
import { triggerHaptic } from "@/lib/native/platform";

interface DrlAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    fullName: string;
    studentId?: string;
    className?: string;
    faculty?: string;
  };
  currentScore: number;
  currentSemester: string;
  currentYear: string;
}

export function DrlAppealModal({
  isOpen,
  onClose,
  currentUser,
  currentScore,
  currentSemester,
  currentYear,
}: DrlAppealModalProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [category, setCategory] = useState<number>(2);
  const [selfScore, setSelfScore] = useState<number>(currentScore);
  const [announcedScore, setAnnouncedScore] = useState<number>(Math.max(35, currentScore - 6));
  const [requestedScore, setRequestedScore] = useState<number>(currentScore);

  const defaultPreset = HUIT_APPEAL_PRESETS[1];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
  const [reasonTitle, setReasonTitle] = useState<string>(defaultPreset.title);
  const [explanation, setExplanation] = useState<string>(defaultPreset.sampleExplanation);
  const [evidence, setEvidence] = useState<string>(defaultPreset.sampleEvidence);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    triggerHaptic("light");
    const p = HUIT_APPEAL_PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    setSelectedPresetId(p.id);
    setReasonTitle(p.title);
    setExplanation(p.sampleExplanation);
    setEvidence(p.sampleEvidence);
    setCategory(p.categoryDefault);
  };

  const appealData: DrlAppealData = {
    studentName: currentUser.fullName,
    studentId: currentUser.studentId || "2001210001",
    studentClass: currentUser.className || "12DHTH01",
    faculty: currentUser.faculty || "Khoa Công Nghệ Thông Tin",
    semesterName: currentSemester || "Học kỳ 1",
    academicYear: currentYear || "2024-2025",
    category,
    selfScore,
    announcedScore,
    requestedScore,
    reasonPreset: reasonTitle,
    customExplanation: explanation,
    evidenceDescription: evidence,
    submissionDate: new Date().toLocaleDateString("vi-VN"),
  };

  const formattedText = formatHuitAppealText(appealData);

  const handleCopy = () => {
    triggerHaptic("success");
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Soạn Đơn Khiếu Nại / Phúc Khảo ĐRL (Điều 13)
              </h3>
              <p className="text-xs text-slate-500">
                Quy trình khiếu nại chính thức theo Quyết định số 3385/QĐ-DCT của Hiệu trưởng HUIT
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900">
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("edit");
            }}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "edit"
                ? "border-rose-600 text-rose-600 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Soạn thảo thông tin</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("preview");
            }}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "preview"
                ? "border-rose-600 text-rose-600 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Xem trước đơn A4 chuẩn</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "edit" ? (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="leading-relaxed">
                  <strong>Điều 13 QĐ 3385:</strong> Sinh viên có quyền khiếu nại lên Cố vấn học tập, Ban Chủ nhiệm Khoa trong thời hạn <strong>05 ngày làm việc</strong> kể từ ngày công bố điểm. Đơn cần nêu rõ tiêu chí và minh chứng cụ thể.
                </div>
              </div>

              {/* Preset Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Chọn lý do khiếu nại mẫu (tự động điền nội dung):</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {HUIT_APPEAL_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                        selectedPresetId === p.id
                          ? "border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-semibold shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="truncate">{p.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Mặc định: Tiêu chí {p.categoryDefault}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tiêu chí khiếu nại
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value={1}>Tiêu chí 1 (Ý thức học tập)</option>
                    <option value={2}>Tiêu chí 2 (Ý thức chấp hành nội quy)</option>
                    <option value={3}>Tiêu chí 3 (Hoạt động chính trị - xã hội)</option>
                    <option value={4}>Tiêu chí 4 (Phẩm chất công dân)</option>
                    <option value={5}>Tiêu chí 5 (Khen thưởng / SV5T)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Điểm tự chấm (Form 01)
                  </label>
                  <input
                    type="number"
                    value={selfScore}
                    onChange={(e) => setSelfScore(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Điểm công bố (bị thiếu)
                  </label>
                  <input
                    type="number"
                    value={announcedScore}
                    onChange={(e) => setAnnouncedScore(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-rose-600 dark:text-rose-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Điểm đề nghị cập nhật
                  </label>
                  <input
                    type="number"
                    value={requestedScore}
                    onChange={(e) => setRequestedScore(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-emerald-600 dark:text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Textareas */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nội dung giải trình chi tiết:
                </label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Minh chứng hợp lệ kèm theo (Mô tả hoặc liên kết file Drive):
                </label>
                <textarea
                  rows={2}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-serif leading-relaxed space-y-4 shadow-sm text-xs sm:text-sm">
                <div className="text-center space-y-0.5 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <p className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="font-semibold text-xs">Độc lập - Tự do - Hạnh phúc</p>
                  <div className="w-24 h-0.5 bg-slate-400 mx-auto mt-1" />
                </div>

                <div className="text-center pt-2">
                  <h4 className="text-base font-bold uppercase tracking-wide">
                    ĐƠN KHIẾU NẠI VỀ KẾT QUẢ ĐÁNH GIÁ ĐIỂM RÈN LUYỆN
                  </h4>
                  <p className="italic text-[11px] font-sans text-slate-500">
                    (Căn cứ Điều 13, Quyết định số 3385/QĐ-DCT của Hiệu trưởng Trường Đại học Công Thương TP.HCM)
                  </p>
                </div>

                <div className="space-y-2 text-xs font-sans">
                  <p className="font-semibold">
                    Kính gửi:
                    <br />- Ban Chủ nhiệm {appealData.faculty}
                    <br />- Cố vấn học tập lớp {appealData.studentClass}
                    <br />- Hội đồng Đánh giá Điểm rèn luyện cấp Khoa
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <p>Họ và tên: <strong>{appealData.studentName}</strong></p>
                    <p>MSSV: <strong>{appealData.studentId}</strong></p>
                    <p>Lớp sinh hoạt: <strong>{appealData.studentClass}</strong></p>
                    <p>Học kỳ: <strong>{appealData.semesterName} ({appealData.academicYear})</strong></p>
                  </div>
                  <div className="pt-2">
                    <p>
                      <strong>1. Nội dung khiếu nại tại Tiêu chí {appealData.category}:</strong>
                      <br />- Điểm tự chấm (Form 01): <strong>{appealData.selfScore}</strong> điểm
                      <br />- Điểm công bố hiện tại: <strong className="text-rose-600">{appealData.announcedScore}</strong> điểm
                      <br />- Điểm đề nghị thẩm định lại: <strong className="text-emerald-600">{appealData.requestedScore}</strong> điểm
                    </p>
                    <p className="pt-2">
                      <strong>2. Lý do khiếu nại:</strong> {appealData.reasonPreset}
                    </p>
                    <p className="pt-1">
                      <strong>3. Giải trình chi tiết:</strong> {appealData.customExplanation}
                    </p>
                    <p className="pt-1">
                      <strong>4. Minh chứng kèm theo:</strong> {appealData.evidenceDescription}
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex justify-end text-center text-xs font-sans">
                  <div className="w-52 space-y-1">
                    <p className="italic text-[11px]">TP.HCM, ngày {appealData.submissionDate}</p>
                    <p className="font-bold">NGƯỜI LÀM ĐƠN</p>
                    <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                    <div className="h-14 flex items-end justify-center font-semibold">
                      {appealData.studentName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã chép nội dung!" : "Sao chép đơn"}</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => {
                triggerHaptic("medium");
                setActiveTab("preview");
                setTimeout(() => window.print(), 100);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In đơn A4</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

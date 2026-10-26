"use client";

import React, { useState } from "react";
import { X, Images, Printer, ExternalLink, ShieldCheck, AlertTriangle, Filter, CheckCircle2, Eye, Clock } from "lucide-react";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { triggerHaptic } from "@/lib/native/platform";

interface ProofVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DrlRecord[];
  semester: Semester | null;
  currentUser: {
    fullName: string;
    studentId?: string;
    className?: string;
    faculty?: string;
  };
}

export function ProofVaultModal({
  isOpen,
  onClose,
  records,
  semester,
  currentUser,
}: ProofVaultModalProps) {
  const [activeTab, setActiveTab] = useState<"gallery" | "contact_sheet">("gallery");
  const [filterCat, setFilterCat] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<"all" | "has_proof" | "missing_proof" | "valid" | "pending_review">("all");
  const [previewingRecord, setPreviewingRecord] = useState<DrlRecord | null>(null);

  if (!isOpen) return null;

  const totalRecords = records.length;
  const withProof = records.filter((r) => Boolean(r.evidenceUrl));
  const missingProof = records.filter((r) => !r.evidenceUrl);
  const validProof = records.filter((r) => (r.auditStatus || (r.evidenceUrl ? "pending_review" : "missing")) === "valid");
  const proofPercentage = totalRecords > 0 ? Math.round((withProof.length / totalRecords) * 100) : 100;

  const filteredRecords = records.filter((r) => {
    const st = r.auditStatus || (r.evidenceUrl ? "pending_review" : "missing");
    if (filterCat > 0 && r.category !== filterCat) return false;
    if (filterStatus === "has_proof" && !r.evidenceUrl) return false;
    if (filterStatus === "missing_proof" && Boolean(r.evidenceUrl)) return false;
    if (filterStatus === "valid" && st !== "valid") return false;
    if (filterStatus === "pending_review" && st !== "pending_review") return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kho Minh Chứng Rèn Luyện & Bảng Đính Kèm A4
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý ảnh minh chứng, lọc hồ sơ và xuất trang in liên hoàn kèm Form 01
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
              setActiveTab("gallery");
            }}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "gallery"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Thư Viện Minh Chứng ({withProof.length}/{totalRecords})</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("contact_sheet");
            }}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "contact_sheet"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Bảng Đính Kèm In A4</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "gallery" ? (
            <div className="space-y-4">
              {/* Stats Card */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
                  <div className="text-[11px] text-slate-500">Tổng hoạt động</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalRecords}</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-center">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Đã có minh chứng</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {withProof.length} ({proofPercentage}%)
                  </div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 text-center">
                  <div className="text-[11px] text-amber-700 dark:text-amber-300">Còn thiếu minh chứng</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">{missingProof.length}</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "Tất cả TC", cat: 0 },
                    { label: "TC 1", cat: 1 },
                    { label: "TC 2", cat: 2 },
                    { label: "TC 3", cat: 3 },
                    { label: "TC 4", cat: 4 },
                    { label: "TC 5", cat: 5 },
                  ].map((btn) => (
                    <button
                      key={btn.cat}
                      onClick={() => {
                        triggerHaptic("light");
                        setFilterCat(btn.cat);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                        filterCat === btn.cat
                          ? "bg-indigo-600 text-white font-semibold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                      filterStatus === "all" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Tất cả ({records.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus("valid")}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                      filterStatus === "valid" ? "bg-emerald-600 text-white font-semibold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Hợp lệ ({validProof.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus("has_proof")}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                      filterStatus === "has_proof" ? "bg-sky-600 text-white font-semibold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Có ảnh ({withProof.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus("missing_proof")}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                      filterStatus === "missing_proof" ? "bg-amber-600 text-white font-semibold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Thiếu ({missingProof.length})
                  </button>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredRecords.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-slate-400">
                    Không tìm thấy hoạt động nào phù hợp tiêu chí lọc.
                  </div>
                ) : (
                  filteredRecords.map((r) => {
                    const hasImage = r.evidenceUrl?.startsWith("data:image");
                    const hasLink = r.evidenceUrl && !hasImage;

                    return (
                      <div
                        key={r.id}
                        className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 overflow-hidden shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col"
                      >
                        {/* Image / Thumbnail Container */}
                        <div className="relative aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800">
                          {hasImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.evidenceUrl || ""}
                              alt={r.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : hasLink ? (
                            <div className="p-4 text-center space-y-1">
                              <ExternalLink className="w-6 h-6 text-blue-500 mx-auto" />
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold underline truncate max-w-[180px]">
                                Liên kết minh chứng Drive / Cloud
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-center space-y-1 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-6 h-6 mx-auto opacity-70" />
                              <div className="text-[11px] font-semibold">Chưa có minh chứng</div>
                            </div>
                          )}

                          {/* Category Badge */}
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs font-mono">
                            TC{r.category}
                          </span>

                          {/* Quick preview button */}
                          {hasImage && (
                            <button
                              type="button"
                              onClick={() => setPreviewingRecord(r)}
                              className="absolute top-2 right-2 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                              title="Xem ảnh phóng to"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                              {r.title}
                            </h4>
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                              <span>{r.occurredAt || "Không rõ ngày"}</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {Number(r.points) > 0 ? "+" : ""}{r.points}đ
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                            {(() => {
                              const st = r.auditStatus || (r.evidenceUrl ? "pending_review" : "missing");
                              if (st === "valid") {
                                return (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Hợp lệ</span>
                                  </span>
                                );
                              }
                              if (st === "pending_review") {
                                return (
                                  <span className="text-sky-600 dark:text-sky-400 font-medium flex items-center space-x-1">
                                    <Clock className="w-3 h-3 text-sky-500" />
                                    <span>Chờ lớp duyệt</span>
                                  </span>
                                );
                              }
                              if (st === "rejected") {
                                return (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center space-x-1">
                                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                                    <span>Cần bổ sung</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Thiếu ảnh</span>
                                </span>
                              );
                            })()}

                            {r.evidenceUrl && !hasImage && (
                              <a
                                href={r.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center space-x-0.5"
                              >
                                <span>Mở link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: PRINTABLE A4 CONTACT SHEET */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Bảng tổng hợp minh chứng hình ảnh sẵn sàng in kèm theo Mẫu số 01 nộp Khoa/Trường
                </p>
                <button
                  onClick={() => {
                    triggerHaptic("medium");
                    window.print();
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Bảng Minh Chứng A4</span>
                </button>
              </div>

              {/* Printable Contact Paper Preview */}
              <div className="p-8 bg-white dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-serif leading-relaxed space-y-6 shadow-sm text-xs">
                {/* Header */}
                <div className="text-center space-y-1 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <p className="font-bold uppercase tracking-wider text-[11px]">
                    TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH
                  </p>
                  <p className="font-semibold uppercase text-xs">
                    {currentUser.faculty || "KHOA ĐÀO TẠO"} • LỚP {currentUser.className || "12DHTH01"}
                  </p>
                  <h3 className="text-base font-bold uppercase tracking-wide pt-2">
                    BẢNG ĐÍNH KÈM HÌNH ẢNH MINH CHỨNG ĐIỂM RÈN LUYỆN
                  </h3>
                  <p className="italic text-[11px] font-sans text-slate-600 dark:text-slate-400">
                    (Kèm theo Phiếu đánh giá Mẫu số 01 - {semester?.name || "Học kỳ"} - Năm học 2024-2025)
                  </p>
                  <div className="pt-2 font-sans flex justify-center space-x-6 text-xs text-slate-700 dark:text-slate-300">
                    <span>Sinh viên: <strong>{currentUser.fullName}</strong></span>
                    <span>MSSV: <strong>{currentUser.studentId || "2001210001"}</strong></span>
                    <span>Tổng số minh chứng: <strong>{withProof.length} ảnh/tài liệu</strong></span>
                  </div>
                </div>

                {/* Evidence Grid Layout */}
                <div className="grid grid-cols-2 gap-4">
                  {withProof.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-slate-400 italic">
                      Chưa có minh chứng hình ảnh nào được đính kèm.
                    </div>
                  ) : (
                    withProof.map((r, idx) => (
                      <div
                        key={r.id}
                        className="p-3 border border-slate-300 dark:border-slate-700 rounded-lg space-y-2 bg-slate-50/30 dark:bg-slate-900/40 text-left font-sans"
                      >
                        <div className="flex justify-between items-start text-xs border-b border-slate-200 dark:border-slate-800 pb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            #{idx + 1}. [TC{r.category}] {r.title}
                          </span>
                          <span className="font-bold text-emerald-600 shrink-0 font-mono">
                            {Number(r.points) > 0 ? "+" : ""}{r.points}đ
                          </span>
                        </div>

                        {/* Image Preview Box */}
                        <div className="aspect-[4/3] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-center overflow-hidden">
                          {r.evidenceUrl?.startsWith("data:image") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.evidenceUrl || ""}
                              alt={r.title}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="p-3 text-center text-slate-500 space-y-1">
                              <ExternalLink className="w-5 h-5 mx-auto text-blue-500" />
                              <div className="text-[10px] break-all max-w-[200px]">{r.evidenceUrl}</div>
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>Thời gian: {r.occurredAt || "Trong học kỳ"}</span>
                          <span>Xác nhận: Đầy đủ căn cứ</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Signature confirmation */}
                <div className="grid grid-cols-2 text-center text-xs font-sans pt-6">
                  <div>
                    <p className="font-bold">SINH VIÊN CAM KẾT</p>
                    <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                    <div className="h-16 flex items-end justify-center font-semibold">
                      {currentUser.fullName}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold">CỐ VẤN HỌC TẬP XÁC NHẬN</p>
                    <p className="italic text-[10px] text-slate-500">(Đã đối chiếu minh chứng gốc)</p>
                    <div className="h-16 flex items-end justify-center text-slate-400">
                      .......................................
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
          <span className="text-slate-500">Chuẩn hồ sơ đính kèm Quyết định số 3385/QĐ-DCT HUIT</span>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Enlarged Single Proof Preview Modal */}
      {previewingRecord && previewingRecord.evidenceUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate pr-4">
                {previewingRecord.title}
              </span>
              <button
                onClick={() => setPreviewingRecord(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex-1 overflow-auto flex items-center justify-center bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewingRecord.evidenceUrl || ""}
                alt={previewingRecord.title}
                className="max-h-[70vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, QrCode, Printer, Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { DrlRecord } from "@/lib/db/schema";
import { triggerHaptic } from "@/lib/native/platform";

interface ActivityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DrlRecord | null;
  studentName?: string;
  studentClass?: string;
  semesterName?: string;
}

export function ActivityVerificationModal({
  isOpen,
  onClose,
  record,
  studentName = "Sinh viên HUIT",
  studentClass = "12DHTH01",
  semesterName = "Học kỳ 1",
}: ActivityVerificationModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!record || !isOpen) return;

    // Formulate a compact verification payload
    const verificationText = JSON.stringify({
      id: record.id,
      title: record.title,
      cat: record.category,
      pts: record.points,
      student: studentName,
      class: studentClass,
      date: record.occurredAt || "Không rõ",
      verified: true,
    });

    QRCode.toDataURL(verificationText, {
      width: 220,
      margin: 1.5,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Generation error:", err));
  }, [record, isOpen, studentName, studentClass]);

  if (!isOpen || !record) return null;

  const handleCopy = () => {
    triggerHaptic("success");
    const summary = `[XÁC NHẬN MINH CHỨNG ĐRL HUIT]\nHoạt động: ${record.title}\nTiêu chí: ${record.category} | Điểm: ${Number(record.points) > 0 ? "+" : ""}${record.points}đ\nSinh viên: ${studentName} (Lớp: ${studentClass})\nNgày diễn ra: ${record.occurredAt || "N/A"}\nMã chứng thực: ${record.id}\nTrạng thái: Đã thẩm định minh chứng`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Thẻ Xác Nhận & Mã QR Minh Chứng
              </h3>
              <p className="text-xs text-slate-500">
                Thẩm định hoạt động rèn luyện phục vụ họp lớp & xét duyệt
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

        {/* Content Body */}
        <div className="p-5 space-y-4 text-center">
          {/* Card Presentation */}
          <div className="p-5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                HUIT • ĐIỂM RÈN LUYỆN
              </span>
              <span className="flex items-center space-x-1 text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hợp lệ</span>
              </span>
            </div>

            {/* QR Code Render */}
            <div className="flex justify-center py-2">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR Code Minh Chứng"
                  className="w-44 h-44 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs p-1.5 bg-white"
                />
              ) : (
                <div className="w-44 h-44 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                  Đang tạo mã QR...
                </div>
              )}
            </div>

            {/* Activity Details */}
            <div className="text-left space-y-1.5 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">
                {record.title}
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Tiêu chí: <strong>Nhóm {record.category}</strong></span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  {Number(record.points) > 0 ? "+" : ""}{record.points} điểm
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Sinh viên: <strong>{studentName}</strong></span>
                <span>Lớp: {studentClass}</span>
              </div>
              {record.occurredAt && (
                <div className="text-slate-400 text-[11px]">
                  Thời gian: {record.occurredAt}
                </div>
              )}
              {record.evidenceUrl && (
                <div className="pt-1 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Đã đính kèm ảnh minh chứng</span>
                  </span>
                  <a
                    href={record.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center space-x-0.5"
                  >
                    <span>Xem ảnh</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã chép!" : "Sao chép"}</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => {
                triggerHaptic("medium");
                window.print();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In thẻ</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition shadow-xs"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { X, ExternalLink, Copy, Check, FileImage, ShieldCheck, AlertCircle } from "lucide-react";
import { DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";

interface ProofViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DrlRecord | null;
}

export const ProofViewerModal: React.FC<ProofViewerModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !record || !record.evidenceUrl) return null;

  const url = record.evidenceUrl.trim();
  const catMeta = CATEGORIES[record.category];

  // Helper: check if direct image URL
  const isDirectImage = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(url);

  // Helper: convert google drive view link to embed / preview link
  let embedUrl: string | null = null;
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400">
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Xem Trước Minh Chứng</h3>
              <p className="text-[11px] text-slate-300">
                {catMeta.code} ({catMeta.shortName}) • {record.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Preview Canvas */}
          <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[220px] max-h-[380px] flex items-center justify-center relative">
            {isDirectImage && !imgError ? (
              <img
                src={url}
                alt={record.title}
                onError={() => setImgError(true)}
                className="max-h-[360px] w-auto max-w-full object-contain mx-auto"
              />
            ) : embedUrl ? (
              <iframe
                src={embedUrl}
                title="Google Drive Preview"
                className="w-full h-[320px] border-none"
                allow="autoplay"
              />
            ) : (
              <div className="p-6 text-center space-y-2">
                <FileImage className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Liên kết lưu trữ tài liệu trực tuyến
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto truncate font-mono">
                  {url}
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở trong tab mới</span>
                </a>
              </div>
            )}
          </div>

          {/* Activity Info Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Hoạt động:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right max-w-xs truncate">
                {record.title}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Điểm tự chấm:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {Number(record.points) > 0 ? `+${record.points}` : record.points}đ
              </span>
            </div>
            {record.occurredAt && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Thời gian diễn ra:</span>
                <span className="text-slate-700 dark:text-slate-300">{record.occurredAt}</span>
              </div>
            )}
            {record.note && (
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Ghi chú:</span> {record.note}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/90 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã sao chép link" : "Sao chép link"}</span>
          </button>

          <div className="flex items-center space-x-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở liên kết gốc</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

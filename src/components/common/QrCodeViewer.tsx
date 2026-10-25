"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode as QrIcon, Copy, Check, ExternalLink } from "lucide-react";

interface QrCodeViewerProps {
  value: string;
  size?: number;
  label?: string;
  showLink?: boolean;
}

export const QrCodeViewer: React.FC<QrCodeViewerProps> = ({
  value,
  size = 140,
  label = "Quét để xem minh chứng",
  showLink = true,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!value || !value.trim()) {
      setDataUrl(null);
      return;
    }

    QRCode.toDataURL(value.trim(), {
      width: size,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [value, size]);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!value || !value.trim() || !dataUrl) {
    return null;
  }

  return (
    <div className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-center">
      {/* QR Image */}
      <div className="bg-white p-1 rounded-lg border border-slate-100 shadow-inner">
        <img
          src={dataUrl}
          alt="QR Code Minh Chứng"
          width={size}
          height={size}
          className="rounded block"
        />
      </div>

      {label && (
        <span className="text-[11px] font-bold text-slate-800 mt-2 block">
          {label}
        </span>
      )}

      {showLink && (
        <div className="flex items-center space-x-2 mt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-1 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Đã chép link" : "Sao chép link"}</span>
          </button>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
            title="Mở liên kết"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};


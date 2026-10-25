"use client";

import React, { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
} from "lucide-react";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";

interface CsvExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  semester: Semester | null;
  records: DrlRecord[];
  onImportComplete: () => void;
}

interface ParsedRecord {
  category: number;
  title: string;
  points: number;
  quantity: number;
  occurredAt?: string;
  evidenceUrl?: string;
  note?: string;
  isValid: boolean;
  error?: string;
}

export const CsvExchangeModal: React.FC<CsvExchangeModalProps> = ({
  isOpen,
  onClose,
  semester,
  records,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRecord[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  if (!isOpen || !semester) return null;

  // Handle CSV Export
  const handleExportCsv = () => {
    // Header
    const headers = [
      "TieuChi",
      "TenHoatDong",
      "Loai",
      "SoDiem",
      "SoLuong",
      "NgayDienRa",
      "LinkMinhChung",
      "GhiChu",
    ];

    const rows = records.map((r) => [
      `TC${r.category}`,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      r.type,
      r.points,
      r.quantity || 1,
      r.occurredAt || "",
      `"${(r.evidenceUrl || "").replace(/"/g, '""')}"`,
      `"${(r.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanSemesterName = semester.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `HUIT_DRL_${cleanSemesterName}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse CSV/TSV input
  const handleParseCsv = (raw: string) => {
    setCsvText(raw);
    if (!raw.trim()) {
      setParsedRows([]);
      return;
    }

    setIsParsing(true);
    try {
      const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        setParsedRows([]);
        return;
      }

      // Check if first row is header
      const firstLine = lines[0].toLowerCase();
      let startIndex = 0;
      if (
        firstLine.includes("tieuchi") ||
        firstLine.includes("tiêu chí") ||
        firstLine.includes("tên hoạt động") ||
        firstLine.includes("tenhoatdong") ||
        firstLine.includes("category")
      ) {
        startIndex = 1;
      }

      const results: ParsedRecord[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        // Detect delimiter: tab or comma or semicolon
        let parts: string[] = [];
        if (line.includes("\t")) {
          parts = line.split("\t");
        } else if (line.includes(";")) {
          parts = line.split(";");
        } else {
          // simple csv split ignoring quotes
          parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        }

        const cleanParts = parts.map((p) => p.replace(/^"|"$/g, "").trim());

        // Extract fields
        // Column 0: Category (e.g. "TC1", "1", "Tiêu chí 1")
        const catRaw = cleanParts[0] || "";
        const catMatch = catRaw.match(/[1-5]/);
        const category = catMatch ? parseInt(catMatch[0], 10) : 1;

        // Column 1: Title
        const title = cleanParts[1] || "";

        // Column 2: Points (or type)
        // If column 2 is text type ('add', 'default') and column 3 is points
        let points = 0;
        let occurredAt = "";
        let evidenceUrl = "";
        let note = "";

        if (cleanParts.length >= 4 && isNaN(Number(cleanParts[2])) && !isNaN(Number(cleanParts[3]))) {
          points = parseFloat(cleanParts[3]) || 0;
          occurredAt = cleanParts[5] || "";
          evidenceUrl = cleanParts[6] || "";
          note = cleanParts[7] || "";
        } else {
          points = parseFloat(cleanParts[2]) || 0;
          occurredAt = cleanParts[3] || "";
          evidenceUrl = cleanParts[4] || "";
          note = cleanParts[5] || "";
        }

        const isValid = Boolean(title && category >= 1 && category <= 5);

        results.push({
          category,
          title,
          points,
          quantity: 1,
          occurredAt,
          evidenceUrl,
          note,
          isValid,
          error: !title ? "Thiếu tên hoạt động" : category < 1 || category > 5 ? "Tiêu chí không hợp lệ" : undefined,
        });
      }

      setParsedRows(results);
    } catch (e) {
      console.error("Parse CSV error:", e);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let failedCount = 0;

    for (const row of validRows) {
      try {
        const res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semesterId: semester.id,
            category: row.category,
            title: row.title,
            type: row.points < 0 ? "deduct" : "add",
            points: Math.abs(row.points),
            quantity: 1,
            occurredAt: row.occurredAt || new Date().toISOString().split("T")[0],
            evidenceUrl: row.evidenceUrl || null,
            note: row.note ? `[CSV Import] ${row.note}` : "[CSV Import]",
          }),
        });
        if (res.ok) successCount++;
        else failedCount++;
      } catch (err) {
        failedCount++;
      }
    }

    setIsSubmitting(false);
    setImportResult({ success: successCount, failed: failedCount });
    if (successCount > 0) {
      onImportComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Trao Đổi Dữ Liệu CSV / Excel</h2>
              <p className="text-xs text-slate-300">
                Xuất file bảng kê hoặc nhập danh sách hàng loạt ({semester.name})
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

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "export"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Xuất file Excel CSV ({records.length} hoạt động)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "import"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Nhập danh sách hàng loạt</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === "export" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Chuẩn hóa UTF-8 BOM cho Microsoft Excel</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  File CSV được tạo kèm mã định danh byte order mark UTF-8, đảm bảo mở trực tiếp bằng Microsoft Excel trên Windows/Mac hoàn toàn không bị lỗi font tiếng Việt.
                </p>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  Bao gồm: Mã tiêu chí (TC1..TC5), Tên hoạt động, Loại, Số điểm, Ngày diễn ra, Link minh chứng Google Drive, Ghi chú.
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2 font-medium">
                  <span>Học kỳ xuất:</span>
                  <span className="font-bold text-slate-900">{semester.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-4 font-medium">
                  <span>Số lượng hoạt động:</span>
                  <span className="font-bold text-slate-900">{records.length} mục</span>
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Xuống File Bảng Kê (.CSV)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {importResult ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="text-sm font-bold text-emerald-900">
                    Nhập thành công {importResult.success} hoạt động!
                  </h3>
                  {importResult.failed > 0 && (
                    <p className="text-xs text-red-600">
                      Có {importResult.failed} hoạt động không thể nhập do lỗi dữ liệu.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setImportResult(null);
                      setParsedRows([]);
                      setCsvText("");
                    }}
                    className="mt-2 px-4 py-1.5 text-xs font-semibold bg-white border border-emerald-300 rounded-lg text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    Tiếp tục nhập thêm
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="w-full sm:w-auto flex-1 flex items-center justify-center px-4 py-2 bg-white border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-4 h-4 mr-2 text-slate-500" />
                      <span>Chọn file .csv từ máy tính</span>
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Hoặc Dán Dữ Liệu Bảng (Excel / Google Sheet / CSV):
                    </label>
                    <textarea
                      rows={4}
                      value={csvText}
                      onChange={(e) => handleParseCsv(e.target.value)}
                      placeholder={`Ví dụ định dạng dán từ Excel hoặc CSV:\nTC1, Nghiên cứu khoa học sinh viên, 5, 2026-10-15, https://drive.google.com/..., Đạt giải nhì\nTC3, Tham gia ngày hội việc làm, 3, 2026-10-20, https://drive.google.com/..., Nhận giấy chứng nhận`}
                      className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {parsedRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          Xem trước kết quả ({parsedRows.filter((r) => r.isValid).length}/{parsedRows.length} hợp lệ):
                        </span>
                      </div>

                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                        {parsedRows.map((r, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 flex items-center justify-between ${
                              r.isValid ? "bg-white" : "bg-red-50 text-red-900"
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                TC{r.category}
                              </span>
                              <span className="font-medium truncate">{r.title || "(Thiếu tên)"}</span>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0 ml-2">
                              <span className="font-mono font-bold text-slate-700">
                                {r.points > 0 ? `+${r.points}` : r.points}đ
                              </span>
                              {r.isValid ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleImportSubmit}
                        disabled={isSubmitting || parsedRows.filter((r) => r.isValid).length === 0}
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      >
                        {isSubmitting ? (
                          <span>Đang lưu vào học kỳ...</span>
                        ) : (
                          <span>
                            Xác Nhận Nhập {parsedRows.filter((r) => r.isValid).length} Hoạt Động Vào Học Kỳ
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};


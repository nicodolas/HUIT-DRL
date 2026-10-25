"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Download, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { Semester, DrlRecord } from "@/lib/db/schema";
import { ScoreCalculationResult } from "@/lib/drl/calculator";
import { CATEGORIES } from "@/lib/drl/rules";

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSemesterId = searchParams.get("semesterId");

  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>(requestedSemesterId || "");
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [scoreSummary, setScoreSummary] = useState<ScoreCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [formMode, setFormMode] = useState<"official" | "personal">("official");

  // Load auth
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          loadSemesters();
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const loadSemesters = async () => {
    try {
      const res = await fetch("/api/semesters");
      const data = await res.json();
      if (data.semesters && data.semesters.length > 0) {
        setSemesters(data.semesters);
        if (!currentSemesterId) {
          const current = data.semesters.find((s: Semester) => s.isCurrent) || data.semesters[0];
          setCurrentSemesterId(current.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load records
  useEffect(() => {
    if (!currentSemesterId) return;
    setLoading(true);
    fetch(`/api/records?semesterId=${currentSemesterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setRecords(data.records || []);
          setScoreSummary(data.scoreSummary);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSemesterId]);

  if (!user || loading || !scoreSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-2 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Đang tải phiếu đánh giá...</span>
        </div>
      </div>
    );
  }

  const currentSemester = semesters.find((s) => s.id === currentSemesterId) || semesters[0];

  const handleCopySummary = () => {
    if (!scoreSummary) return;
    const text = `[HUIT - ĐIỂM RÈN LUYỆN]
Họ và tên: ${user?.fullName || user?.username}
Lớp: ${user?.className || "Chưa cập nhật"} | Khoa: ${user?.faculty || "Chưa cập nhật"}
Học kỳ: ${currentSemester.name}
- TC1 (Nội quy): ${scoreSummary.categories[1].cappedScore}/25đ
- TC2 (Học tập): ${scoreSummary.categories[2].cappedScore}/20đ
- TC3 (Phong trào): ${scoreSummary.categories[3].cappedScore}/20đ
- TC4 (Cộng đồng): ${scoreSummary.categories[4].cappedScore}/15đ
- TC5 (Cán bộ/NCKH): ${scoreSummary.categories[5].cappedScore}/20đ
=> TỔNG ĐIỂM: ${scoreSummary.totalScore}/100đ (Xếp loại: ${scoreSummary.rating.label})
(Căn cứ theo QĐ 3385/QĐ-DCT)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 text-slate-900 print:bg-white print:p-0">
      {/* Top action bar - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Dashboard</span>
          </Link>
          <div className="text-xs text-slate-500">
            Xem trước bản in phiếu tự đánh giá
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {semesters.length > 1 && (
            <select
              value={currentSemesterId}
              onChange={(e) => setCurrentSemesterId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setFormMode(formMode === "official" ? "personal" : "official")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Chuyển đổi định dạng biểu mẫu"
          >
            <span>{formMode === "official" ? "Biểu mẫu: Mẫu 01 (Nộp Lớp)" : "Biểu mẫu: Xem Cá Nhân"}</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Sao chép kết quả gửi Zalo/Lớp trưởng"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Sao chép Zalo</span>
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>In phiếu / Lưu PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-sm rounded-xl p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:rounded-none">
        {/* Institutional Header */}
        <div className="grid grid-cols-2 gap-4 text-center pb-6 border-b border-slate-200">
          <div>
            <p className="text-[11px] sm:text-xs font-medium uppercase text-slate-600">
              BỘ CÔNG THƯƠNG
            </p>
            <p className="text-xs sm:text-sm font-bold uppercase text-slate-900 mt-0.5">
              TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM
            </p>
            <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-1" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase text-slate-900">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-800 mt-0.5">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="w-28 h-0.5 bg-slate-900 mx-auto mt-1" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-6 space-y-1">
          <h1 className="text-base sm:text-xl font-bold uppercase tracking-tight text-slate-900">
            PHIẾU TỰ ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN
          </h1>
          <p className="text-xs italic text-slate-600">
            (Ban hành kèm theo Quyết định số 3385/QĐ-DCT ngày 12/8/2026 của Hiệu trưởng)
          </p>
          <p className="text-xs font-semibold text-slate-800 mt-1">
            {currentSemester ? currentSemester.name : "Học kỳ"}
          </p>
        </div>

        {/* Student Information Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <span className="text-slate-500">Họ và tên sinh viên:</span>{" "}
            <span className="font-bold text-slate-900">{user.fullName}</span>
          </div>
          <div>
            <span className="text-slate-500">Tên đăng nhập / Mã tài khoản:</span>{" "}
            <span className="font-mono font-semibold text-slate-800">@{user.username}</span>
          </div>
          <div>
            <span className="text-slate-500">Khoa:</span>{" "}
            <span className="font-medium text-slate-900">{user.faculty || "Chưa cập nhật"}</span>
          </div>
          <div>
            <span className="text-slate-500">Lớp sinh hoạt:</span>{" "}
            <span className="font-medium text-slate-900">{user.className || "Chưa cập nhật"}</span>
          </div>
        </div>

        {/* 5 Criteria Summary Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2.5 border-r border-slate-300 w-12 text-center">TT</th>
                <th className="p-2.5 border-r border-slate-300">Nội dung đánh giá rèn luyện</th>
                <th className="p-2.5 border-r border-slate-300 text-center w-20">Khung tối đa</th>
                {formMode === "personal" ? (
                  <>
                    <th className="p-2.5 border-r border-slate-300 text-center w-20">Mặc định</th>
                    <th className="p-2.5 text-center w-24">Điểm tự chấm</th>
                  </>
                ) : (
                  <>
                    <th className="p-2.5 border-r border-slate-300 text-center w-24">SV tự chấm</th>
                    <th className="p-2.5 border-r border-slate-300 text-center w-24">Lớp đánh giá</th>
                    <th className="p-2.5 text-center w-24">Khoa duyệt</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((catNum) => {
                const meta = CATEGORIES[catNum];
                const res = scoreSummary.categories[catNum] || {
                  rawScore: meta.defaultPoints,
                  cappedScore: meta.defaultPoints,
                  maxPoints: meta.maxPoints,
                  recordsCount: 0,
                };

                return (
                  <tr key={catNum} className="border-b border-slate-300 hover:bg-slate-50">
                    <td className="p-2.5 border-r border-slate-300 text-center font-bold">
                      {meta.code}
                    </td>
                    <td className="p-2.5 border-r border-slate-300">
                      <div className="font-semibold text-slate-900">{meta.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{meta.description}</div>
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-center font-semibold">
                      {meta.maxPoints}đ
                    </td>
                    {formMode === "personal" ? (
                      <>
                        <td className="p-2.5 border-r border-slate-300 text-center text-slate-600">
                          +{meta.defaultPoints}đ
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-900 bg-slate-50">
                          {res.cappedScore}đ
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2.5 border-r border-slate-300 text-center font-bold text-slate-900 bg-slate-50/50">
                          {res.cappedScore}đ
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center text-slate-300 font-mono">
                          .....
                        </td>
                        <td className="p-2.5 text-center text-slate-300 font-mono">
                          .....
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                <td colSpan={2} className="p-2.5 text-right border-r border-slate-300 uppercase">
                  Tổng điểm rèn luyện (Thang 100):
                </td>
                <td className="p-2.5 text-center border-r border-slate-300">100đ</td>
                {formMode === "personal" ? (
                  <>
                    <td className="p-2.5 text-center border-r border-slate-300">+60đ</td>
                    <td className="p-2.5 text-center text-sm font-extrabold bg-slate-200">
                      {scoreSummary.totalScore}đ
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2.5 text-center text-sm font-extrabold bg-slate-200 border-r border-slate-300">
                      {scoreSummary.totalScore}đ
                    </td>
                    <td className="p-2.5 text-center text-slate-400 border-r border-slate-300 font-mono">
                      .....
                    </td>
                    <td className="p-2.5 text-center text-slate-400 font-mono">
                      .....
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Classification Result Box */}
        <div className="p-4 rounded-lg border border-slate-300 bg-slate-50 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Kết quả xếp loại học kỳ:</div>
            <div className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
              <span>{scoreSummary.rating.label}</span>
              {scoreSummary.rating.note && (
                <span className="text-xs font-normal text-amber-700">
                  ({scoreSummary.rating.note})
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-600 text-right sm:max-w-xs">
            Quy chuẩn QĐ 3385: Xuất sắc (90-100đ), Tốt (80-89đ), Khá (70-79đ), Trung bình (50-69đ), Yếu (&lt;50đ).
          </div>
        </div>

        {/* Activity Log Annex (if any records recorded) */}
        {records.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
              Phụ lục các hoạt động cộng / trừ điểm đã ghi nhận ({records.length} mục)
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200 w-16 text-center">Tiêu chí</th>
                  <th className="p-2 border-r border-slate-200">Nội dung hoạt động / Vi phạm</th>
                  <th className="p-2 border-r border-slate-200 w-24 text-center">Thời gian</th>
                  <th className="p-2 border-r border-slate-200 w-16 text-center">SL</th>
                  <th className="p-2 text-center w-20">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const pts = Number(r.points) * (r.quantity || 1);
                  return (
                    <tr key={r.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-medium text-slate-600">
                        TC{r.category}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="font-medium text-slate-800">{r.title}</span>
                        {r.note && (
                          <span className="text-[10px] text-slate-500 block italic">
                            Ghi chú: {r.note}
                          </span>
                        )}
                        {r.evidenceUrl && (
                          <span className="text-[10px] text-blue-700 block mt-0.5 font-mono truncate max-w-md">
                            Minh chứng: {r.evidenceUrl}
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                        {r.occurredAt || "-"}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center text-slate-600">
                        x{r.quantity || 1}
                      </td>
                      <td className={`p-2 text-center font-bold ${pts >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {pts >= 0 ? `+${pts}` : pts}đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature Blocks */}
        <div className="grid grid-cols-3 gap-4 text-center pt-8 text-xs">
          <div>
            <p className="font-bold uppercase text-slate-900">SINH VIÊN TỰ CHẤM</p>
            <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900">{user.fullName}</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">BAN CÁN SỰ LỚP</p>
            <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="text-slate-400">....................................</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">CỐ VẤN HỌC TẬP</p>
            <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="text-slate-400">....................................</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}

"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  Share2,
  Award,
  BookOpen,
  HeartHandshake,
  Activity,
  Users,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { DrlRecord, Semester } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";

interface ExtracurricularDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  records: DrlRecord[];
  currentSemester?: Semester | null;
}

export const ExtracurricularDossierModal: React.FC<ExtracurricularDossierModalProps> = ({
  isOpen,
  onClose,
  user,
  records,
  currentSemester,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Group activities into 4 professional portfolio pillars
  const academicActivities = records.filter(
    (r) =>
      r.category === 2 ||
      (r.title || "").toLowerCase().includes("nckh") ||
      (r.title || "").toLowerCase().includes("nghiên cứu") ||
      (r.title || "").toLowerCase().includes("olympic") ||
      (r.title || "").toLowerCase().includes("hội thảo") ||
      (r.title || "").toLowerCase().includes("học thuật")
  );

  const volunteerActivities = records.filter(
    (r) =>
      (r.category === 3 && (r.title || "").toLowerCase().includes("tình nguyện")) ||
      (r.title || "").toLowerCase().includes("mùa hè xanh") ||
      (r.title || "").toLowerCase().includes("xuân tình nguyện") ||
      (r.title || "").toLowerCase().includes("tiếp sức mùa thi") ||
      (r.title || "").toLowerCase().includes("hiến máu") ||
      (r.title || "").toLowerCase().includes("cộng đồng") ||
      r.category === 4
  );

  const sportsArtsActivities = records.filter(
    (r) =>
      (r.category === 3 && !volunteerActivities.includes(r)) ||
      (r.title || "").toLowerCase().includes("hội thao") ||
      (r.title || "").toLowerCase().includes("giải bóng") ||
      (r.title || "").toLowerCase().includes("văn nghệ") ||
      (r.title || "").toLowerCase().includes("chạy bộ") ||
      (r.title || "").toLowerCase().includes("cầu lông")
  );

  const leadershipActivities = records.filter(
    (r) =>
      r.category === 5 &&
      !academicActivities.includes(r) &&
      !sportsArtsActivities.includes(r)
  );

  const totalEarnedPoints = records
    .filter((r) => Number(r.points) > 0)
    .reduce((sum, r) => sum + Number(r.points) * (r.quantity || 1), 0);

  const evidenceCount = records.filter((r) => !!r.evidenceUrl).length;
  const evidencePercent = records.length > 0 ? Math.round((evidenceCount / records.length) * 100) : 100;

  const handleShareZalo = async () => {
    const text = `📜 HỒ SƠ HOẠT ĐỘNG NGOẠI KHÓA HUIT\n👤 Sinh viên: ${user?.fullName || "Sinh viên"}\n🏫 Khoa: ${user?.faculty || "CNTT"}\n🎯 Tổng hoạt động: ${records.length} sự kiện\n📈 Điểm cộng tích lũy: +${totalEarnedPoints} điểm\n📎 Minh chứng số: ${evidenceCount}/${records.length} (${evidencePercent}%)\nXem chi tiết tại Hệ thống ĐRL HUIT!`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Hồ Sơ Trích Lục Hoạt Động Ngoại Khóa & Thành Tích
              </h2>
              <p className="text-[11px] text-slate-300">
                Bản tổng hợp dùng cho CV ứng tuyển, hồ sơ học bổng & danh hiệu SV5T
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

        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 no-print">
            <span className="text-xs text-slate-600 font-medium">
              Định dạng chuẩn A4 có thể in trực tiếp hoặc lưu dưới dạng PDF
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShareZalo}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{copied ? "Đã chép!" : "Chia sẻ"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>In Hồ Sơ (A4)</span>
              </button>
            </div>
          </div>

          {/* Printable Sheet Wrapper */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-900">
            {/* National & University Title */}
            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH
              </span>
              <h1 className="text-base sm:text-lg font-extrabold uppercase text-slate-900 tracking-tight">
                BẢN TRÍCH LỤC THÀNH TÍCH HOẠT ĐỘNG NGOẠI KHÓA & RÈN LUYỆN
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Căn cứ cơ sở dữ liệu rèn luyện sinh viên theo Quyết định 3385/QĐ-DCT
              </p>
            </div>

            {/* Student Info Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Họ và tên:</span>
                <span className="font-bold text-slate-900">{user?.fullName || "Sinh viên"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Tài khoản:</span>
                <span className="font-mono font-bold text-slate-900">@{user?.username}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Khoa:</span>
                <span className="font-semibold text-slate-900">{user?.faculty || "Công nghệ Thông tin"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Lớp:</span>
                <span className="font-semibold text-slate-900">{user?.className || "12DHTH01"}</span>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Tổng hoạt động</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">{records.length}</span>
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <span className="text-[11px] text-emerald-800 block">Tổng điểm rèn luyện cộng</span>
                <span className="text-lg font-bold text-emerald-700 mt-0.5 block">+{totalEarnedPoints}đ</span>
              </div>
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                <span className="text-[11px] text-blue-800 block">Minh chứng đính kèm</span>
                <span className="text-lg font-bold text-blue-700 mt-0.5 block">{evidenceCount}/{records.length}</span>
              </div>
            </div>

            {/* Section I: Academic & Research */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>I. Hoạt động Nghiên cứu khoa học & Học thuật ({academicActivities.length})</span>
              </div>
              {academicActivities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1 pl-6">Chưa có bản ghi hoạt động trong mục này.</p>
              ) : (
                <div className="space-y-1.5 pl-4">
                  {academicActivities.map((act) => (
                    <div key={act.id} className="flex items-start justify-between text-xs py-1 border-b border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-900">{act.title}</span>
                        {act.note && <span className="text-slate-500 ml-1.5">({act.note})</span>}
                        {act.occurredAt && <span className="text-slate-400 text-[10px] ml-2 block sm:inline">• Ngày: {act.occurredAt}</span>}
                      </div>
                      <span className="font-mono font-bold text-emerald-700 shrink-0">+{act.points}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section II: Volunteer & Community */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                <HeartHandshake className="w-4 h-4 text-rose-600" />
                <span>II. Phong trào Tình nguyện & Vì cộng đồng ({volunteerActivities.length})</span>
              </div>
              {volunteerActivities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1 pl-6">Chưa có bản ghi hoạt động trong mục này.</p>
              ) : (
                <div className="space-y-1.5 pl-4">
                  {volunteerActivities.map((act) => (
                    <div key={act.id} className="flex items-start justify-between text-xs py-1 border-b border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-900">{act.title}</span>
                        {act.note && <span className="text-slate-500 ml-1.5">({act.note})</span>}
                        {act.occurredAt && <span className="text-slate-400 text-[10px] ml-2 block sm:inline">• Ngày: {act.occurredAt}</span>}
                      </div>
                      <span className="font-mono font-bold text-emerald-700 shrink-0">+{act.points}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section III: Sports & Culture */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>III. Văn hóa, Văn nghệ & Thể dục thể thao ({sportsArtsActivities.length})</span>
              </div>
              {sportsArtsActivities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1 pl-6">Chưa có bản ghi hoạt động trong mục này.</p>
              ) : (
                <div className="space-y-1.5 pl-4">
                  {sportsArtsActivities.map((act) => (
                    <div key={act.id} className="flex items-start justify-between text-xs py-1 border-b border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-900">{act.title}</span>
                        {act.note && <span className="text-slate-500 ml-1.5">({act.note})</span>}
                        {act.occurredAt && <span className="text-slate-400 text-[10px] ml-2 block sm:inline">• Ngày: {act.occurredAt}</span>}
                      </div>
                      <span className="font-mono font-bold text-emerald-700 shrink-0">+{act.points}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section IV: Leadership & Union */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                <span>IV. Hoạt động Cán bộ lớp, Đoàn thể & Khen thưởng ({leadershipActivities.length})</span>
              </div>
              {leadershipActivities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1 pl-6">Chưa có bản ghi hoạt động trong mục này.</p>
              ) : (
                <div className="space-y-1.5 pl-4">
                  {leadershipActivities.map((act) => (
                    <div key={act.id} className="flex items-start justify-between text-xs py-1 border-b border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-900">{act.title}</span>
                        {act.note && <span className="text-slate-500 ml-1.5">({act.note})</span>}
                        {act.occurredAt && <span className="text-slate-400 text-[10px] ml-2 block sm:inline">• Ngày: {act.occurredAt}</span>}
                      </div>
                      <span className="font-mono font-bold text-emerald-700 shrink-0">+{act.points}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Signatures */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs text-slate-700">
              <div>
                <span className="font-semibold block">XÁC NHẬN CỦA ĐOÀN - HỘI / CỐ VẤN</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">(Ký và ghi rõ họ tên)</span>
                <div className="h-16" />
                <p className="text-slate-400">............................................</p>
              </div>
              <div>
                <span className="font-semibold block">NGƯỜI LẬP HỒ SƠ</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">(Ký và ghi rõ họ tên)</span>
                <div className="h-16" />
                <p className="font-bold text-slate-900">{user?.fullName || "Sinh viên"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 no-print">
          <span>Trường Đại học Công Thương TP.HCM • Cổng ĐRL Sinh Viên</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

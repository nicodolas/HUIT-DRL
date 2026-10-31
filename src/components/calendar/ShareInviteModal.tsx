"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  Users,
  Clock,
  ShieldAlert,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UserCheck,
} from "lucide-react";
import { DrlRecord } from "@/lib/db/schema";
import { triggerHaptic } from "@/lib/native/platform";
import QRCode from "qrcode";

interface ShareInviteModalProps {
  isOpen: boolean;
  record: DrlRecord | null;
  onClose: () => void;
}

interface InviteData {
  id: string;
  code: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface ClaimUser {
  id: string;
  claimedAt: string;
  userId: string;
  username: string;
  fullName: string;
  className: string | null;
}

export function ShareInviteModal({
  isOpen,
  record,
  onClose,
}: ShareInviteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [claims, setClaims] = useState<ClaimUser[]>([]);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings form state
  const [maxUsesInput, setMaxUsesInput] = useState<string>("");
  const [expiresInHours, setExpiresInHours] = useState<number | "null">(24);

  // Load or create invite when modal opens
  useEffect(() => {
    if (!isOpen || !record) {
      setInvite(null);
      setClaims([]);
      setQrDataUrl(null);
      setShowQr(false);
      setError(null);
      return;
    }

    const fetchOrCreateInvite = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Check existing invite
        const res = await fetch(`/api/calendar/invites?recordId=${record.id}`);
        const data = await res.json();

        if (res.ok && data.invite) {
          setInvite(data.invite);
          setClaims(data.claims || []);
          setMaxUsesInput(data.invite.maxUses ? String(data.invite.maxUses) : "");
        } else {
          // 2. Auto-create default invite (24h, unlimited or 10 uses)
          const createRes = await fetch("/api/calendar/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recordId: record.id,
              expiresInHours: 72, // 3 days default
              maxUses: 10,
            }),
          });
          const createData = await createRes.json();
          if (createRes.ok && createData.invite) {
            setInvite(createData.invite);
            setClaims([]);
            setMaxUsesInput(createData.invite.maxUses ? String(createData.invite.maxUses) : "");
          } else {
            setError(createData.error || "Không thể tạo mã mời");
          }
        }
      } catch (err: any) {
        console.error("Fetch invite error:", err);
        setError("Lỗi kết nối khi tải mã mời chia sẻ");
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateInvite();
  }, [isOpen, record]);

  // Generate QR code data URL whenever invite code changes
  useEffect(() => {
    if (!invite?.code) return;
    QRCode.toDataURL(invite.code, {
      width: 240,
      margin: 1.5,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code generation error:", err));
  }, [invite?.code]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyCode = async () => {
    if (!invite?.code) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      triggerHaptic("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      triggerHaptic("warning");
    }
  };

  const handleToggleActive = async () => {
    if (!invite) return;
    setUpdating(true);
    triggerHaptic("light");
    try {
      const res = await fetch(`/api/calendar/invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !invite.isActive }),
      });
      const data = await res.json();
      if (res.ok && data.invite) {
        setInvite(data.invite);
      } else {
        alert(data.error || "Không thể cập nhật trạng thái");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!invite) return;
    setUpdating(true);
    triggerHaptic("light");
    try {
      const parsedUses = maxUsesInput.trim() === "" ? null : Number(maxUsesInput);
      const res = await fetch(`/api/calendar/invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxUses: parsedUses,
          expiresInHours: expiresInHours === "null" ? null : Number(expiresInHours),
        }),
      });
      const data = await res.json();
      if (res.ok && data.invite) {
        setInvite(data.invite);
        triggerHaptic("success");
        alert("Đã cập nhật cài đặt mã mời!");
      } else {
        alert(data.error || "Không thể lưu cài đặt");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-invite-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden focus:outline-none transition-all flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="share-invite-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Chia sẻ hoạt động cho bạn bè
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {record.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Đang tạo mã mời chia sẻ...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : invite ? (
            <>
              {/* Invite Code Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-slate-50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-slate-900 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mã mời tham gia hoạt động</span>
                  </span>

                  <button
                    onClick={handleToggleActive}
                    disabled={updating}
                    className={`inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full transition cursor-pointer ${
                      invite.isActive
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {invite.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-500" />
                        <span>Đang mở</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span>Tạm khóa</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Display Code */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                  <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-slate-900 dark:text-white select-all">
                    {invite.code}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowQr(!showQr)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      title="Hiển thị mã QR"
                      aria-label="Hiển thị mã QR"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-slate-950" />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code Popup */}
                {showQr && qrDataUrl && (
                  <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-2 animate-in zoom-in-95 duration-150">
                    <img
                      src={qrDataUrl}
                      alt={`QR code cho mã mời ${invite.code}`}
                      className="w-44 h-44 rounded-xl border border-slate-100 dark:border-slate-800"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Bạn cùng lớp có thể quét mã hoặc nhập mã <strong className="font-mono text-slate-800 dark:text-slate-200">{invite.code}</strong>
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <span className="flex items-center space-x-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Đã dùng: <strong>{invite.usesCount}</strong>
                      {invite.maxUses !== null ? ` / ${invite.maxUses}` : " lượt (không giới hạn)"}
                    </span>
                  </span>

                  {invite.expiresAt && (
                    <span className="flex items-center space-x-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Hết hạn:{" "}
                        {new Date(invite.expiresAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Settings Accordion */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Cài đặt giới hạn mã mời
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Số lượt tham gia tối đa:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      placeholder="Không giới hạn"
                      value={maxUsesInput}
                      onChange={(e) => setMaxUsesInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Để trống nếu không giới hạn
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Thời hạn hiệu lực:
                    </label>
                    <select
                      value={expiresInHours}
                      onChange={(e) =>
                        setExpiresInHours(
                          e.target.value === "null" ? "null" : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value={12}>12 giờ</option>
                      <option value={24}>24 giờ (1 ngày)</option>
                      <option value={72}>3 ngày</option>
                      <option value={168}>7 ngày</option>
                      <option value="null">Không hết hạn</option>
                    </select>
                  </div>
                </div>

                <div className="text-right pt-1">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={updating}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
                  >
                    {updating ? "Đang lưu..." : "Cập nhật cài đặt"}
                  </button>
                </div>
              </div>

              {/* Claimed Participants List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>Bạn bè đã tham gia ({claims.length})</span>
                  </h4>
                </div>

                {claims.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    Chưa có bạn nào nhập mã mời này. Hãy gửi mã hoặc QR cho bạn bè!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {claim.fullName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            @{claim.username} {claim.className ? `• ${claim.className}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(claim.claimedAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Người nhận sẽ tự nộp minh chứng cá nhân.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}


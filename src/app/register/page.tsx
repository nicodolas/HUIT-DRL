"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Lock, User, AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { saveAuthToken } from "@/lib/api/client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [faculty, setFaculty] = useState("Công nghệ Thông tin");
  const [className, setClassName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");
  const captchaLoadedAtRef = useRef<number>(Date.now());

  const fetchCaptcha = async () => {
    try {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setCaptchaToken(data.token);
          captchaLoadedAtRef.current = Date.now();
        }
      }
    } catch {
      // Fail silently
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // Real-time username existence check
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [checkMessage, setCheckMessage] = useState<string>("");

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setCheckStatus("idle");
      setCheckMessage("");
      return;
    }

    if (clean.length < 3) {
      setCheckStatus("invalid");
      setCheckMessage("Tối thiểu 3 ký tự.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) {
      setCheckStatus("invalid");
      setCheckMessage("Chỉ dùng chữ cái, số, gạch dưới, gạch ngang hoặc dấu chấm.");
      return;
    }

    setCheckStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.available) {
          setCheckStatus("available");
          setCheckMessage(data.message || "Tên đăng nhập khả dụng.");
        } else {
          setCheckStatus(data.valid ? "taken" : "invalid");
          setCheckMessage(data.message || "Tên đăng nhập đã tồn tại.");
        }
      } catch {
        setCheckStatus("idle");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      setError("Tên đăng nhập phải có ít nhất 3 ký tự.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError("Tên đăng nhập chỉ chứa chữ cái, số, dấu gạch dưới (_), gạch ngang (-) hoặc dấu chấm (.)");
      return;
    }

    if (checkStatus === "taken") {
      setError("Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);

    try {
      // Zero-friction buffer: ensure timing window (>= 1600ms) is satisfied for fast autofill / UI automation
      const elapsed = Date.now() - captchaLoadedAtRef.current;
      if (elapsed < 1600) {
        await new Promise((resolve) => setTimeout(resolve, 1600 - elapsed));
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          fullName: fullName.trim() || cleanUsername,
          faculty: faculty.trim() || undefined,
          className: className.trim() || undefined,
          password,
          honeypot,
          captchaToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký thất bại");
      }

      if (data.token) {
        saveAuthToken(data.token);
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-2xl p-7 sm:p-8 shadow-xs border border-slate-200 space-y-6">
        {/* Brand header */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                HUIT<span className="text-amber-600">.DRL</span>
              </span>
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                QĐ 3385
              </span>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Đăng ký tài khoản
          </h1>
          <p className="text-xs text-slate-500">
            Khởi tạo sổ điểm rèn luyện cá nhân với 60 điểm mặc định
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Honeypot field for invisible bot defense */}
          <input
            type="text"
            name="honeypot"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            className="opacity-0 absolute -left-[9999px] top-0 pointer-events-none h-0 w-0"
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Tên đăng nhập <span className="text-red-500">*</span>
              </label>
              {checkStatus === "checking" && (
                <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </span>
              )}
              {checkStatus === "available" && (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{checkMessage}</span>
                </span>
              )}
              {(checkStatus === "taken" || checkStatus === "invalid") && (
                <span className="text-[11px] text-red-600 font-medium flex items-center space-x-1">
                  <XCircle className="w-3 h-3" />
                  <span>{checkMessage}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ví dụ: nguyenvana hoặc an_it"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className={`w-full pl-10 pr-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none transition-colors ${
                  checkStatus === "available"
                    ? "border-emerald-400 focus:ring-2 focus:ring-emerald-500"
                    : checkStatus === "taken" || checkStatus === "invalid"
                    ? "border-red-400 focus:ring-2 focus:ring-red-500"
                    : "border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                } text-slate-900 placeholder:text-slate-400`}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Chỉ dùng chữ cái, số, gạch dưới. Tối thiểu 3 ký tự.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Họ và tên hiển thị <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Nguyễn Văn An"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Khoa đào tạo
              </label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 transition-colors"
              >
                <option value="Công nghệ Thông tin">CN Thông tin</option>
                <option value="Công nghệ Thực phẩm">CN Thực phẩm</option>
                <option value="Quản trị Kinh doanh">Quản trị KD</option>
                <option value="Tài chính - Ngân hàng">Tài chính - NH</option>
                <option value="Điện - Điện tử">Điện - Điện tử</option>
                <option value="Cơ khí">Công nghệ Cơ khí</option>
                <option value="Ngoại ngữ">Ngoại ngữ</option>
                <option value="Luật">Luật</option>
                <option value="Khoa học Ứng dụng">Khoa học Ứng dụng</option>
                <option value="Khác">Khoa khác</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Lớp sinh hoạt <span className="text-slate-400 font-normal">(tùy chọn)</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 12DHTH01"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || checkStatus === "taken"}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
          >
            <span>{loading ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-slate-900 hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Lock, User, Mail, School, BookOpen, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [mssv, setMssv] = useState("");
  const [email, setEmail] = useState("");
  const [faculty, setFaculty] = useState("Công nghệ Thông tin");
  const [className, setClassName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          mssv,
          email,
          faculty,
          className,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký thất bại");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-huit-blue-800 to-huit-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
            <GraduationCap className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-huit-blue-800">
            Tạo tài khoản HUIT<span className="text-huit-orange-600">.DRL</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tự quản lý điểm rèn luyện cá nhân - Khởi tạo sẵn 60đ mặc định
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Họ và tên sinh viên *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                MSSV *
              </label>
              <input
                type="text"
                placeholder="2001210123"
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Lớp sinh hoạt
              </label>
              <input
                type="text"
                placeholder="12DHTH01"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Khoa đào tạo
            </label>
            <select
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-medium"
            >
              <option value="Công nghệ Thông tin">Khoa Công nghệ Thông tin</option>
              <option value="Thực phẩm & Hóa học">Khoa CN Thực phẩm</option>
              <option value="Quản trị Kinh doanh">Khoa Quản trị Kinh doanh</option>
              <option value="Tài chính - Ngân hàng">Khoa Tài chính - Ngân hàng</option>
              <option value="Điện - Điện tử">Khoa Điện - Điện tử</option>
              <option value="Cơ khí">Khoa Công nghệ Cơ khí</option>
              <option value="Ngoại ngữ">Khoa Ngoại ngữ</option>
              <option value="Luật">Khoa Luật</option>
              <option value="Khoa học Ứng dụng">Khoa Khoa học Ứng dụng</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Email đăng nhập *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="2001210123@sinhvien.huit.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Mật khẩu (tối thiểu 6 ký tự) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-gradient-to-r from-huit-blue-700 to-huit-blue-600 hover:from-huit-blue-800 hover:to-huit-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-900/15 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-1 text-center text-xs text-slate-500">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-bold text-huit-blue-700 hover:text-huit-blue-800 hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

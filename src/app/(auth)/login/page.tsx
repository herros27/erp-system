"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCompanyStore } from "@/stores/company-store";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { setActiveCompany, setCompanies, setPermissions } = useCompanyStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const demoAccounts = [
    {
      name: "Super Admin",
      email: "superadmin@erp.co.id",
      role: "Akses Penuh (*)",
      variant: "super",
    },
    {
      name: "Admin Akuntansi",
      email: "admin@erp.co.id",
      role: "Keuangan & Laporan",
      variant: "normal",
    },
    {
      name: "Admin Gudang",
      email: "gudang@erp.co.id",
      role: "Stok & Gudang",
      variant: "normal",
    },
    {
      name: "Staff Pembelian",
      email: "pembelian@erp.co.id",
      role: "Modul Pembelian",
      variant: "normal",
    },
    {
      name: "Staff Penjualan",
      email: "penjualan@erp.co.id",
      role: "Modul Penjualan",
      variant: "normal",
    },
  ];

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "password123" }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      setUser(data.data.user);
      setActiveCompany(data.data.activeCompany);
      setCompanies(data.data.companies);
      setPermissions(data.data.permissions);

      router.push("/dashboard");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      setUser(data.data.user);
      setActiveCompany(data.data.activeCompany);
      setCompanies(data.data.companies);
      setPermissions(data.data.permissions);

      router.push("/dashboard");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className='min-h-screen flex'
      style={{ background: "var(--bg-primary)" }}>
      {/* Left Panel - Branding */}
      <div
        className='hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center'
        style={{
          background:
            "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
        }}>
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl' />
          <div className='absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl' />
        </div>
        <div className='relative z-10 text-center px-12'>
          <div className='w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8'>
            <Building2 className='w-10 h-10 text-white' />
          </div>
          <h1 className='text-4xl font-bold text-white mb-4'>ERP Indonesia</h1>
          <p className='text-lg text-white/80 leading-relaxed max-w-md'>
            Sistem Enterprise Resource Planning terintegrasi untuk mengelola
            bisnis Anda secara efisien dan modern.
          </p>
          <div className='mt-12 grid grid-cols-3 gap-6 text-center'>
            {[
              { label: "Multi Perusahaan", value: "∞" },
              { label: "Modul Lengkap", value: "9+" },
              { label: "Aman & Handal", value: "100%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className='bg-white/10 backdrop-blur-sm rounded-xl p-4'>
                <div className='text-2xl font-bold text-white'>
                  {stat.value}
                </div>
                <div className='text-xs text-white/70 mt-1'>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className='flex-1 flex items-center justify-center px-6 py-12'>
        <div className='w-full max-w-md animate-fade-in'>
          <div className='lg:hidden text-center mb-8'>
            <div
              className='w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4'
              style={{ background: "var(--accent)" }}>
              <Building2 className='w-7 h-7 text-white' />
            </div>
            <h1 className='text-2xl font-bold gradient-text'>ERP Indonesia</h1>
          </div>

          <div className='mb-8'>
            <h2
              className='text-2xl font-bold'
              style={{ color: "var(--text-primary)" }}>
              Selamat Datang
            </h2>
            <p className='mt-2' style={{ color: "var(--text-secondary)" }}>
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          {error && (
            <div
              className='mb-6 p-4 rounded-xl text-sm animate-scale-in'
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fecaca",
              }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label
                className='block text-sm font-medium mb-2'
                style={{ color: "var(--text-primary)" }}>
                Email
              </label>
              <div className='relative'>
                <Mail
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5'
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='input'
                  style={{ paddingLeft: 40 }}
                  placeholder='nama@perusahaan.com'
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label
                className='block text-sm font-medium mb-2'
                style={{ color: "var(--text-primary)" }}>
                Kata Sandi
              </label>
              <div className='relative'>
                <Lock
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5'
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='input'
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  placeholder='Masukkan kata sandi'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2'
                  style={{ color: "var(--text-muted)" }}>
                  {showPassword ? (
                    <EyeOff className='w-5 h-5' />
                  ) : (
                    <Eye className='w-5 h-5' />
                  )}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='btn btn-primary w-full btn-lg'>
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          <div className='mt-8 pt-6 border-t border-zinc-200/60 dark:border-zinc-800'>
            <p
              className='text-xs font-extrabold uppercase tracking-widest mb-4'
              style={{ color: "var(--text-muted)" }}>
              Klik untuk Masuk Cepat (Quick Login):
            </p>
            <div className='space-y-2.5'>
              {demoAccounts.map((account) => {
                const isSuper = account.variant === "super";
                return (
                  <button
                    key={account.email}
                    type='button'
                    onClick={() => handleQuickLogin(account.email)}
                    disabled={loading}
                    className={`w-full text-left flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 select-none group hover:translate-x-1 ${
                      isSuper
                        ? "bg-zinc-950 text-white border-zinc-900 hover:bg-zinc-905 dark:bg-white dark:text-zinc-950 dark:border-zinc-100 dark:hover:bg-zinc-100"
                        : "bg-zinc-50 border-zinc-200/60 hover:border-zinc-400 dark:bg-zinc-900/60 dark:border-zinc-850 dark:hover:border-zinc-700"
                    }`}>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSuper
                            ? "bg-white/10 dark:bg-zinc-950/10"
                            : "bg-zinc-100 dark:bg-zinc-800"
                        }`}>
                        {isSuper ? (
                          <ShieldCheck className='w-4 h-4 text-zinc-100 dark:text-zinc-950' />
                        ) : (
                          <User className='w-4 h-4 text-zinc-500 dark:text-zinc-400' />
                        )}
                      </div>
                      <div>
                        <h4
                          className={`text-xs font-extrabold ${
                            isSuper
                              ? "text-white dark:text-zinc-950"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}>
                          {account.name}
                        </h4>
                        <p
                          className={`text-[10px] ${
                            isSuper
                              ? "text-zinc-400 dark:text-zinc-500"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}>
                          {account.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 border ${
                        isSuper
                          ? "bg-white/10 border-white/20 text-white dark:bg-zinc-950/10 dark:border-zinc-950/20 dark:text-zinc-950"
                          : "bg-white border-zinc-200/80 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
                      }`}>
                      {account.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

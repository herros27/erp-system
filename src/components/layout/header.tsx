"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCompanyStore } from "@/stores/company-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  User,
  Check,
  Menu,
} from "lucide-react";
import { toast } from "sonner";

export function Header() {
  const router = useRouter();
  const { user, clearUser } = useAuthStore();
  const {
    activeCompany,
    companies,
    setActiveCompany,
    setPermissions,
    clearCompany,
  } = useCompanyStore();
  // const { setMobileOpen } = useSidebarStore();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [switchingCompany, setSwitchingCompany] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isMobileOpen, setMobileOpen } = useSidebarStore();
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearUser();
      clearCompany();
      router.push("/login");
    } catch {
      toast.error("Gagal logout");
    }
  };

  useEffect(() => {
    if (!activeCompany) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [activeCompany?.id]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const markRead = async (id: string, link?: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setShowNotifMenu(false);
    fetchNotifications();
    if (link) router.push(link);
  };

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === activeCompany?.id || switchingCompany) return;
    setSwitchingCompany(true);
    try {
      const res = await fetch("/api/auth/switch-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveCompany(data.data.activeCompany);
        setPermissions(data.data.permissions);
        setShowCompanyMenu(false);
        toast.success(`Beralih ke ${data.data.activeCompany.name}`);
        router.refresh();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal mengganti perusahaan");
    } finally {
      setSwitchingCompany(false);
    }
  };

  return (
    <header
      className='sticky top-0 z-20 flex items-center justify-between px-6 glass'
      style={{
        height: "var(--header-height)",
        borderBottom: "1px solid var(--border-color)",
      }}>
      {/* Left */}
      <div className='flex items-center gap-3'>
        {/* HAMBURGER BUTTON */}
        <button
          type='button'
          className='p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg lg:hidden'
          // UBAH DI SINI: gunakan isMobileOpen untuk melakukan toggle
          onClick={() => setMobileOpen(!isMobileOpen)}>
          <Menu size={22} />
        </button>

        {/* Company Switcher */}
        <div className='relative'>
          <button
            onClick={() => {
              setShowCompanyMenu(!showCompanyMenu);
              setShowUserMenu(false);
            }}
            className='flex items-center gap-2 px-3 py-2 rounded-lg transition-all'
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
            }}>
            <div
              className='w-7 h-7 rounded-md flex items-center justify-center'
              style={{ background: "var(--accent)", color: "white" }}>
              <Building2 size={14} />
            </div>
            <div className='text-left hidden sm:block'>
              <p
                className='text-sm font-semibold'
                style={{ color: "var(--text-primary)" }}>
                {activeCompany?.name || "Pilih Perusahaan"}
              </p>
              <p className='text-[10px]' style={{ color: "var(--text-muted)" }}>
                {activeCompany?.code || "-"}
              </p>
            </div>
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </button>

          {showCompanyMenu && (
            <div
              className='absolute top-full left-0 mt-2 w-72 rounded-xl shadow-xl animate-scale-in z-50'
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
              }}>
              <div
                className='p-3'
                style={{ borderBottom: "1px solid var(--border-color)" }}>
                <p
                  className='text-xs font-semibold'
                  style={{ color: "var(--text-muted)" }}>
                  GANTI PERUSAHAAN
                </p>
              </div>
              <div className='p-2 max-h-64 overflow-y-auto'>
                {companies.map((uc) => (
                  <button
                    key={uc.company.id}
                    onClick={() => handleSwitchCompany(uc.company.id)}
                    className='flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-left'
                    style={{
                      background:
                        activeCompany?.id === uc.company.id
                          ? "var(--accent-light)"
                          : "transparent",
                    }}
                    disabled={switchingCompany}>
                    <div
                      className='w-8 h-8 rounded-md flex items-center justify-center shrink-0'
                      style={{
                        background:
                          activeCompany?.id === uc.company.id
                            ? "var(--accent)"
                            : "var(--bg-tertiary)",
                        color:
                          activeCompany?.id === uc.company.id
                            ? "white"
                            : "var(--text-muted)",
                      }}>
                      <Building2 size={16} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p
                        className='text-sm font-medium truncate'
                        style={{ color: "var(--text-primary)" }}>
                        {uc.company.name}
                      </p>
                      <p
                        className='text-[11px]'
                        style={{ color: "var(--text-muted)" }}>
                        {uc.role.displayName}
                      </p>
                    </div>
                    {activeCompany?.id === uc.company.id && (
                      <Check size={16} style={{ color: "var(--accent)" }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className='flex items-center gap-2'>
        <button onClick={toggleTheme} className='btn btn-ghost p-2'>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className='relative'>
          <button
            className='btn btn-ghost p-2 relative'
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowCompanyMenu(false);
              setShowUserMenu(false);
              fetchNotifications();
            }}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className='absolute top-1 right-1 min-w-[8px] h-2 px-0.5 rounded-full text-[9px] flex items-center justify-center text-white'
                style={{ background: "#000000" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifMenu && (
            <div
              className='
        absolute top-full right-0 mt-3
  w-96 max-h-[32rem]

  rounded-3xl
  border border-zinc-200
  bg-white

  shadow-[0_10px_40px_rgba(0,0,0,0.08)]

  overflow-hidden

  flex flex-col

  animate-in fade-in zoom-in-95 duration-200
  z-50
    '>
              {/* Header */}
              <div
                className='
        flex items-start justify-between
    px-6 pt-5 pb-4
    border-b border-zinc-100
      '>
                <div className=''>
                  <p className=' text-xs font-semibold tracking-[0.2em] uppercase text-zinc-400'>
                    Notifikasi
                  </p>

                  <p className='text-sm text-zinc-500 mt-0.5'>
                    Aktivitas terbaru sistem
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    className='
            text-xs font-semibold
            text-zinc-900
            transition-all duration-200

            hover:text-zinc-600
            hover:underline
          '
                    onClick={markAllRead}>
                    Tandai semua
                  </button>
                )}
              </div>

              {/* Content */}
              <div className='overflow-y-auto flex-1 scrollbar-hide'>
                {notifications.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-14 px-6'>
                    <div
                      className='
              flex items-center justify-center
              w-14 h-14 rounded-2xl
              bg-zinc-100
              mb-4
            '>
                      🔔
                    </div>

                    <p className='text-sm font-medium text-zinc-700'>
                      Tidak ada notifikasi
                    </p>

                    <p className='text-xs text-zinc-500 mt-1 text-center'>
                      Semua aktivitas terbaru akan muncul di sini
                    </p>
                  </div>
                ) : (
                  <div className='p-2 space-y-1'>
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id, n.link || undefined)}
                        className={`
                group w-full text-left
                rounded-2xl
                px-4 py-3
                transition-all duration-300

                hover:bg-zinc-50
                hover:translate-x-1

                ${!n.isRead ? "bg-zinc-100/70" : "bg-transparent"}
              `}>
                        <div className='flex items-start gap-3'>
                          {/* Indicator */}
                          <div className='pt-1'>
                            <div
                              className={`
                      w-2.5 h-2.5 rounded-full transition-all duration-300
                      ${
                        !n.isRead
                          ? "bg-zinc-900 scale-100"
                          : "bg-zinc-300 scale-75"
                      }
                    `}
                            />
                          </div>

                          {/* Text */}
                          <div className='min-w-0 flex-1'>
                            <p
                              className={`
                      text-sm truncate transition-colors duration-300
                      ${
                        !n.isRead
                          ? "font-semibold text-zinc-900"
                          : "font-medium text-zinc-700"
                      }
                    `}>
                              {n.title}
                            </p>

                            <p className='text-xs text-zinc-500 mt-1 line-clamp-2'>
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className='relative'>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowCompanyMenu(false);
            }}
            className='flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all'
            style={{
              background: showUserMenu ? "var(--bg-tertiary)" : "transparent",
            }}>
            <div
              className='w-8 h-8 rounded-full flex items-center justify-center'
              style={{
                background: "var(--accent)",
                color: "var(--bg-secondary)",
              }}>
              <User size={16} />
            </div>
            <span
              className='text-sm font-medium hidden sm:block'
              style={{ color: "var(--text-primary)" }}>
              {user?.name}
            </span>
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </button>

          {showUserMenu && (
            <div
              className='
    absolute top-full right-0 mt-3 w-64
    rounded-3xl
    border border-zinc-200
    bg-white
    shadow-[0_10px_40px_rgba(0,0,0,0.08)]
    backdrop-blur-xl
    overflow-hidden
    animate-in fade-in zoom-in-95 duration-200
    z-50
  '>
              {/* Header User */}
              <div className='px-5 py-4 border-b border-zinc-100'>
                <div className='flex items-center gap-3'>
                  {/* Avatar */}
                  <div
                    className='
          flex items-center justify-center
          w-11 h-11 rounded-2xl
          bg-zinc-100
          text-zinc-700
          font-semibold text-sm
        '>
                    {user?.name?.charAt(0)}
                  </div>

                  {/* User Info */}
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-zinc-900 truncate'>
                      {user?.name}
                    </p>

                    <p className='text-xs text-zinc-500 truncate'>
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu */}
              <div className='p-3'>
                <button
                  onClick={handleLogout}
                  className='
        group flex items-center gap-3
        w-full rounded-2xl
        px-4 py-3
        text-sm font-medium
        text-red-500
        transition-all duration-300 ease-out

        hover:bg-red-50
        hover:text-red-600
        hover:translate-x-1

        active:scale-[0.98]
      '>
                  {/* Icon Container */}
                  <div
                    className='
          flex items-center justify-center
          w-10 h-10 rounded-xl
          bg-red-50
          transition-all duration-300

          group-hover:bg-red-100
          group-hover:scale-105
        '>
                    <LogOut
                      size={18}
                      className='
            transition-all duration-300
            group-hover:rotate-6
          '
                    />
                  </div>

                  {/* Text */}
                  <span className='tracking-tight'>Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler */}
      {(showCompanyMenu || showUserMenu || showNotifMenu) && (
        <div
          className='fixed inset-0 z-40'
          onClick={() => {
            setShowCompanyMenu(false);
            setShowUserMenu(false);
            setShowNotifMenu(false);
          }}
        />
      )}
    </header>
  );
}

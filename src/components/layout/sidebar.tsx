"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useCompanyStore } from "@/stores/company-store";
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  Users,
  Warehouse as WarehouseIcon,
  ShoppingCart,
  Receipt,
  CreditCard,
  FileText,
  ClipboardCheck,
  History,
  ChevronLeft,
  ChevronRight,
  Building2,
  Settings,
  Ruler,
  TrendingUp,
  Box,
  DollarSign,
  Activity,
} from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "MENU UTAMA",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "SALES & FINANCE",
    items: [
      {
        label: "Penjualan (SO)",
        href: "/penjualan",
        icon: TrendingUp,
        permission: "penjualan.view",
      },
      {
        label: "Surat Jalan (SJ)",
        href: "/surat-jalan",
        icon: Truck,
        permission: "penjualan.view",
      },
      {
        label: "Invoice",
        href: "/invoice",
        icon: Receipt,
        permission: "penjualan.view",
      },
      {
        label: "Pembayaran",
        href: "/pembayaran",
        icon: CreditCard,
        permission: "penjualan.view",
      },
    ],
  },
  {
    title: "PURCHASING & INVENTORY",
    items: [
      {
        label: "Pembelian (PO)",
        href: "/pembelian",
        icon: ShoppingCart,
        permission: "pembelian.view",
      },
      {
        label: "Inventori",
        href: "/inventori",
        icon: Box,
        permission: "inventori.view",
      },
      {
        label: "Gudang",
        href: "/gudang",
        icon: WarehouseIcon,
        permission: "gudang.view",
      },
    ],
  },
  {
    title: "MASTER DATA",
    items: [
      {
        label: "Produk",
        href: "/produk",
        icon: Package,
        permission: "produk.view",
      },
      {
        label: "Kategori",
        href: "/kategori",
        icon: Layers,
        permission: "kategori.view",
      },
      {
        label: "Satuan",
        href: "/satuan",
        icon: Ruler,
        permission: "satuan.view",
      },
      {
        label: "Pelanggan",
        href: "/pelanggan",
        icon: Users,
        permission: "pelanggan.view",
      },
      {
        label: "Supplier",
        href: "/supplier",
        icon: Truck,
        permission: "supplier.view",
      },
    ],
  },
  {
    title: "ACCOUNTING & REPORTS",
    items: [
      {
        label: "Akuntansi",
        href: "/akuntansi",
        icon: DollarSign,
        permission: "akuntansi.view",
      },
      {
        label: "Laporan",
        href: "/laporan",
        icon: FileText,
        permission: "laporan.view",
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        label: "Persetujuan",
        href: "/persetujuan",
        icon: ClipboardCheck,
        permission: "persetujuan.view",
      },
      {
        label: "Audit Trail",
        href: "/audit",
        icon: History,
        permission: "audit.view",
      },
      {
        label: "Perusahaan",
        href: "/perusahaan",
        icon: Building2,
        permission: "perusahaan.view",
      },
      {
        label: "Pengguna",
        href: "/pengguna",
        icon: Users,
        permission: "pengguna.view",
      },
      { label: "Pengaturan", href: "/pengaturan", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle, isMobileOpen, setMobileOpen } =
    useSidebarStore();
  const { permissions } = useCompanyStore();

  const renderCollapsed = isCollapsed && !isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col transition-all duration-300 bg-zinc-950  rounded-r-4xl overflow-hidden`}
      style={{
        width: isCollapsed
          ? "var(--sidebar-collapsed)"
          : "var(--sidebar-width)",
      }}>
      {/* Logo */}
      <div
        className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-6"} shrink-0`}
        style={{
          height: "var(--header-height)",
          borderBottom: "1px solid #18181b",
        }}>
        <div
          className={`rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105 ${isCollapsed ? "w-10 h-10" : "w-9 h-9"} bg-white text-zinc-950`}>
          <Activity size={isCollapsed ? 24 : 20} />
        </div>
        {!isCollapsed && (
          <div className='animate-fade-in overflow-hidden'>
            <h1 className='text-base font-extrabold tracking-tight text-white whitespace-nowrap'>
              ERP<span className='text-zinc-400'>System</span>
            </h1>
            <p className='text-[10px] font-medium tracking-wider uppercase text-zinc-500'>
              Enterprise Edition
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className='flex-1 overflow-y-auto py-6 px-4 no-scrollbar'>
        <div className='space-y-6'>
          {menuGroups.map((group, groupIdx) => {
            const filteredItems = group.items.filter((item) => {
              if (!item.permission) return true;
              return (
                permissions.includes(item.permission) ||
                permissions.includes("*")
              );
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIdx} className='flex flex-col'>
                {!isCollapsed && (
                  <h3 className='px-4 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-zinc-600 animate-fade-in'>
                    {group.title}
                  </h3>
                )}

                <div className='space-y-1'>
                  {filteredItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center sidebar-link group relative
                            ${
                              renderCollapsed
                                ? `justify-center p-3 mx-2 ${isActive ? "text-zinc-950 rounded-2xl shadow-sm" : "text-zinc-400 hover:text-white rounded-xl"}`
                                : `gap-3 ${
                                    isActive
                                      ? "text-zinc-950 font-bold rounded-l-full rounded-r-none -mr-4 pl-6 pr-4 py-3 active-tab-curve shadow-sm"
                                      : "text-zinc-400 hover:text-white rounded-xl px-4 py-2.5 mx-2 my-0.5"
                                  }`
                            }`}
                        title={renderCollapsed ? item.label : undefined}>
                        {/* Absolute Animated Background from Right to Left */}
                        {isActive && (
                          <div
                            className={`absolute inset-0 bg-[#F4F4F7] z-0 ${
                              renderCollapsed
                                ? "rounded-2xl"
                                : "rounded-l-full rounded-r-none animate-slide-in-right-left"
                            }`}
                          />
                        )}

                        <span
                          className={`shrink-0 transition-all duration-300 relative z-10 ${
                            isActive
                              ? "text-zinc-950 translate-x-1"
                              : "text-zinc-400 group-hover:text-white"
                          }`}>
                          <Icon size={renderCollapsed ? 24 : 20} />
                        </span>
                        {!renderCollapsed && (
                          <span
                            className={`flex items-center truncate text-sm h-10 transition-all duration-300 relative z-10 ${
                              isActive
                                ? "font-bold text-zinc-950 translate-x-1"
                                : "font-medium text-zinc-400 group-hover:text-white"
                            }`}>
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div
        className='px-4 py-4 shrink-0'
        style={{ borderTop: "1px solid #18181b" }}>
        <button
          onClick={toggle}
          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-900/40 transition-colors duration-200 group'>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={16} />}
          {!isCollapsed && (
            <span className='text-xs font-bold tracking-wider uppercase text-zinc-400 group-hover:text-white transition-colors duration-200'>
              Mode Fokus
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

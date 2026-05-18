"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCompanyStore } from "@/stores/company-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { activeCompany } = useCompanyStore();
  const { isCollapsed } = useSidebarStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ background: "var(--bg-primary)" }}>
        <div className='text-center'>
          <div className='w-12 h-12 rounded-xl mx-auto mb-4 skeleton' />
          <div className='w-32 h-4 mx-auto skeleton' />
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen' style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div
        className='transition-all duration-300'
        style={{
          marginLeft: isCollapsed
            ? "var(--sidebar-collapsed)"
            : "var(--sidebar-width)",
        }}>
        <Header />
        <main
          className='flex-1 min-w-0 overflow-auto p-6 sm:p-8 lg:p-12 animate-fade-in'
          style={{ minHeight: "calc(100vh - var(--header-height))" }}>
          <div className="max-w-[1600px] mx-auto w-full">
            {!activeCompany ? (
              <div className='card p-12 text-center'>
                <h2 className='text-xl font-semibold mb-2'>Pilih Perusahaan</h2>
                <p style={{ color: "var(--text-secondary)" }}>
                  Silakan pilih perusahaan dari menu di atas untuk melanjutkan.
                </p>
              </div>
            ) : (
              /* Bungkus children dengan div untuk memberi margin/padding tambahan */
              <div className="py-6 px-4 sm:px-0"> {/* Silakan ubah class ini sesuai kebutuhan */}
                {children}
              </div>
            )}
          </div>
        </main>
      </div>
      <Toaster
        position='top-right'
        toastOptions={{
          style: {
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          },
        }}
      />
    </div>
  );
}

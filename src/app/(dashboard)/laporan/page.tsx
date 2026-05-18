"use client";

import { useState, useEffect } from "react";
import { useCompanyStore } from "@/stores/company-store";
import { formatRupiah, formatDate } from "@/lib/utils";
import { FileText, Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";

type Tab = "summary" | "sales" | "purchases" | "stock";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LaporanPage() {
  const { activeCompany } = useCompanyStore();
  const [tab, setTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!activeCompany) return;
    fetchReport();
  }, [activeCompany, tab, from, to]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/reports", window.location.origin);
      url.searchParams.set("type", tab === "summary" ? "summary" : tab);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error(json.message);
    } catch {
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    if (tab === "summary") {
      downloadCsv("laporan-ringkasan.csv", [
        ["Metrik", "Nilai"],
        ["Penjualan", String(data.sales?.total || 0)],
        ["Pembelian", String(data.purchases?.total || 0)],
        ["Piutang", String(data.receivable || 0)],
        ["Nilai Persediaan", String(data.inventoryValue || 0)],
        ["Estimasi Laba", String(data.profitEstimate || 0)],
      ]);
    } else if (tab === "sales") {
      downloadCsv("laporan-penjualan.csv", [
        ["No SO", "Pelanggan", "Tanggal", "Total", "Status"],
        ...data.map((o: any) => [
          o.number,
          o.customer?.name,
          formatDate(o.orderDate),
          o.total,
          o.status,
        ]),
      ]);
    } else if (tab === "purchases") {
      downloadCsv("laporan-pembelian.csv", [
        ["No PO", "Supplier", "Tanggal", "Total", "Status"],
        ...data.map((o: any) => [
          o.number,
          o.supplier?.name,
          formatDate(o.orderDate),
          o.total,
          o.status,
        ]),
      ]);
    } else if (tab === "stock") {
      downloadCsv("laporan-stok.csv", [
        ["Kode", "Produk", "Gudang", "Qty", "Nilai"],
        ...data.map((i: any) => [
          i.product?.code,
          i.product?.name,
          i.warehouse?.name,
          i.quantity,
          i.quantity * i.product?.buyPrice,
        ]),
      ]);
    }
    toast.success("File CSV diunduh");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "Ringkasan" },
    { id: "sales", label: "Penjualan" },
    { id: "purchases", label: "Pembelian" },
    { id: "stock", label: "Stok" },
  ];

  return (
    <div className='space-y-8 animate-in fade-in duration-300'>
      {/* HEADER SECTION */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3'>
            <BarChart3
              size={28}
              className='text-zinc-900 dark:text-zinc-100 shrink-0'
            />
            Laporan Bisnis
          </h1>
          <p className='text-sm mt-1 text-zinc-500 dark:text-zinc-400 font-medium'>
            Analisis metrik keuangan, inventori, dan ekspor data transaksi
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!data || loading}
          className='btn btn-primary flex items-center gap-2 select-none'>
          <Download size={16} />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* CONTROLS SECTION */}
      <div className='flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm'>
        {/* VIEW TOGGLE TAB BAR */}
        <div className='flex gap-2 flex-wrap'>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn btn-sm ${
                tab === t.id
                  ? "btn-primary"
                  : "btn-secondary"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* DATE RANGE FILTER PANEL */}
        <div className='flex flex-wrap items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-bold text-zinc-500 shrink-0 select-none'>
              Dari:
            </span>
            <input
              type='date'
              className='input py-1.5'
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className='flex items-center gap-2'>
            <span className='text-xs font-bold text-zinc-500 shrink-0 select-none'>
              Sampai:
            </span>
            <input
              type='date'
              className='input py-1.5'
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <button
            onClick={fetchReport}
            disabled={loading}
            className='btn btn-primary btn-sm'>
            {loading ? "Memproses..." : "Terapkan"}
          </button>
        </div>
      </div>

      {/* MAIN DATA VIEW */}
      {loading ? (
        <div className='card p-12 text-center text-zinc-400'>
          <div className='w-8 h-8 border-2 border-zinc-950 dark:border-white border-t-transparent rounded-full animate-spin mb-4 mx-auto'></div>
          <p className='text-xs font-extrabold uppercase tracking-widest'>
            Memuat Laporan...
          </p>
        </div>
      ) : tab === "summary" && data ? (
        <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[
            {
              label: "Total Penjualan",
              value: formatRupiah(data.sales?.total || 0),
              sub: `${data.sales?.count || 0} transaksi`,
            },
            {
              label: "Total Pembelian",
              value: formatRupiah(data.purchases?.total || 0),
              sub: `${data.purchases?.count || 0} PO`,
            },
            {
              label: "Total Piutang Usaha",
              value: formatRupiah(data.receivable || 0),
              sub: "Belum lunas terbayar",
            },
            {
              label: "Nilai Aset Persediaan",
              value: formatRupiah(data.inventoryValue || 0),
              sub: "Kalkulasi HPP produk aktif",
            },
            {
              label: "Estimasi Laba Kotor",
              value: formatRupiah(data.profitEstimate || 0),
              sub: "Penjualan - Pembelian",
            },
          ].map((c) => (
            <div
              key={c.label}
              className='card flex flex-col justify-between group'>
              <div>
                <div className='flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-widest'>
                  <BarChart3
                    size={14}
                    className='group-hover:scale-110 transition-transform duration-200'
                  />
                  <span>{c.label}</span>
                </div>
                <p className='text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-3 font-mono'>
                  {c.value}
                </p>
              </div>
              <p className='text-[10px] font-bold text-zinc-450 dark:text-zinc-500 mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2'>
                <span className='w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700'></span>
                {c.sub}
              </p>
            </div>
          ))}
        </div>
      ) : tab === "sales" && Array.isArray(data) ? (
        <ReportTable
          headers={["No SO", "Pelanggan", "Tanggal", "Total", "Status"]}
          rows={data.map((o: any) => [
            o.number,
            o.customer?.name || "-",
            formatDate(o.orderDate),
            formatRupiah(o.total),
            o.status,
          ])}
        />
      ) : tab === "purchases" && Array.isArray(data) ? (
        <ReportTable
          headers={["No PO", "Supplier", "Tanggal", "Total", "Status"]}
          rows={data.map((o: any) => [
            o.number,
            o.supplier?.name || "-",
            formatDate(o.orderDate),
            formatRupiah(o.total),
            o.status,
          ])}
        />
      ) : tab === "stock" && Array.isArray(data) ? (
        <ReportTable
          headers={["Kode", "Produk", "Gudang", "Qty", "Nilai Persediaan"]}
          rows={data.map((i: any) => [
            i.product?.code || "-",
            i.product?.name || "-",
            i.warehouse?.name || "-",
            String(i.quantity),
            formatRupiah(i.quantity * (i.product?.buyPrice || 0)),
          ])}
        />
      ) : (
        <div className='card p-12 text-center text-zinc-400'>
          <FileText
            size={40}
            className='mx-auto mb-4 opacity-30 text-zinc-400'
          />
          <p className='text-xs font-extrabold uppercase tracking-widest text-zinc-400'>
            Tidak ada data untuk periode ini
          </p>
        </div>
      )}
    </div>
  );
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  const renderCell = (cell: string) => {
    const upper = String(cell).toUpperCase();
    const isStatus = [
      "DRAFT",
      "CONFIRMED",
      "INDENT",
      "INVOICED",
      "COMPLETED",
      "CANCELLED",
      "PENDING",
      "APPROVED",
      "REJECTED",
      "UNPAID",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "SHIPPED",
      "DELIVERED",
    ].includes(upper);

    if (isStatus) {
      let theme =
        "bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400";
      if (
        ["CONFIRMED", "COMPLETED", "APPROVED", "PAID", "DELIVERED"].includes(
          upper,
        )
      ) {
        theme =
          "bg-zinc-900 border-zinc-955 text-white dark:bg-white dark:border-white dark:text-zinc-950";
      } else if (["CANCELLED", "REJECTED", "OVERDUE"].includes(upper)) {
        theme =
          "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400";
      } else if (["PENDING", "PARTIAL", "UNPAID", "INDENT"].includes(upper)) {
        theme =
          "bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400";
      }
      return (
        <span
          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border whitespace-nowrap shrink-0 select-none ${theme}`}>
          {cell}
        </span>
      );
    }
    return cell;
  };

  return (
    <div className='table-container shadow-sm'>
      <div className='overflow-x-auto'>
        <table className='data-table'>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className='text-center py-12 text-zinc-450 text-xs font-extrabold uppercase tracking-widest'>
                  Tidak ada data untuk ditampilkan
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>
                      {renderCell(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

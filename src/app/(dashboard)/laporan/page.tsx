"use client";

import { useState, useEffect } from "react";
import { useCompanyStore } from "@/stores/company-store";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  FileText,
  Download,
  BarChart3,
  Search,
  Wallet,
  Receipt,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "summary" | "sales" | "purchases" | "stock";

const formatIndoDate = (dateInput: any) => {
  if (!dateInput) return "-";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = d.getDate();
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
};

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

  // New states for sales report dashboard
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  ); // Default to current year for clean initial view
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [customers, setCustomers] = useState<any[]>([]);

  // Dynamically calculate date period based on active tab and dropdown filters
  const getPeriodRange = () => {
    if (tab !== "sales") {
      return { fromDate: from, toDate: to };
    }

    let fromDate = `${new Date().getFullYear()}-01-01`;
    let toDate = new Date().toISOString().split("T")[0];

    if (selectedYear !== "all") {
      const year = parseInt(selectedYear);
      if (selectedMonth !== "all") {
        const month = parseInt(selectedMonth);
        const lastDay = new Date(year, month, 0).getDate();
        fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
        toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else {
        fromDate = `${year}-01-01`;
        toDate = `${year}-12-31`;
      }
    } else {
      // If year is "all", query a wide range
      fromDate = "2020-01-01";
      toDate = "2099-12-31";
    }
    return { fromDate, toDate };
  };

  useEffect(() => {
    if (!activeCompany) return;
    fetchReport();
  }, [activeCompany, tab, from, to, selectedMonth, selectedYear]);

  // Load all customers for the dropdown menu
  useEffect(() => {
    if (!activeCompany) return;
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers?all=true");
        const json = await res.json();
        if (json.success) setCustomers(json.data);
      } catch (err) {
        console.error("Gagal memuat list customer", err);
      }
    };
    fetchCustomers();
  }, [activeCompany]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { fromDate, toDate } = getPeriodRange();
      const url = new URL("/api/reports", window.location.origin);
      url.searchParams.set("type", tab === "summary" ? "summary" : tab);
      url.searchParams.set("from", fromDate);
      url.searchParams.set("to", toDate);
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

  // client-side filtering for sales orders
  const filteredSalesOrders =
    Array.isArray(data) && tab === "sales"
      ? data.filter((item: any) => {
          const matchSearch = searchQuery
            ? item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.customer?.name &&
                item.customer.name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()))
            : true;

          const orderDate = new Date(item.orderDate);
          const matchMonth =
            selectedMonth !== "all"
              ? (orderDate.getMonth() + 1).toString().padStart(2, "0") ===
                selectedMonth
              : true;

          const matchYear =
            selectedYear !== "all"
              ? orderDate.getFullYear().toString() === selectedYear
              : true;

          const matchCustomer =
            selectedCustomer !== "all"
              ? item.customerId === selectedCustomer
              : true;

          return matchSearch && matchMonth && matchYear && matchCustomer;
        })
      : [];

  const totalOmset = filteredSalesOrders.reduce(
    (sum: number, order: any) => sum + (order.total || 0),
    0,
  );
  const totalTransaksi = filteredSalesOrders.length;
  const rataRataTransaksi =
    totalTransaksi > 0 ? totalOmset / totalTransaksi : 0;

  const currentYearVal = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYearVal - i).toString(),
  );

  const months = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

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
      downloadCsv("laporan-penjualan-omset.csv", [
        ["No. SO", "Tanggal", "Customer", "DPP", "PPN", "Total"],
        ...filteredSalesOrders.map((o: any) => [
          o.number,
          formatDate(o.orderDate),
          o.customer?.name || "-",
          o.subtotal || 0,
          o.tax || 0,
          o.total || 0,
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

  const getHeaderInfo = () => {
    if (tab === "sales") {
      return {
        title: "Laporan Penjualan (Omset)",
        subtitle:
          "Pantau ringkasan omset penjualan, total transaksi, dan filter berdasarkan bulan, tahun, atau customer.",
      };
    }
    return {
      title: "Laporan Bisnis",
      subtitle:
        "Analisis metrik keuangan, inventori, dan ekspor data transaksi",
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className='flex flex-col gap-6 lg:gap-8 animate-in fade-in duration-300'>
      {/* HEADER SECTION */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3'>
            <BarChart3
              size={28}
              className='text-zinc-900 dark:text-zinc-100 shrink-0'
            />
            {headerInfo.title}
          </h1>
          <p className='text-sm mt-1 text-zinc-500 dark:text-zinc-400 font-medium'>
            {headerInfo.subtitle}
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
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        {/* VIEW TOGGLE TAB BAR */}
        <div className='flex gap-2 flex-wrap'>
          {tabs.map((t) => {
            const isSummary = t.id === "summary";
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`btn btn-sm px-4 py-2 font-semibold text-xs rounded-lg transition-all duration-200 select-none cursor-pointer ${
                  isSummary
                    ? "bg-[#0d9488] hover:bg-[#0f766e] text-white"
                    : isActive
                    ? "bg-zinc-950 hover:bg-zinc-900 text-white"
                    : "bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/80"
                }`}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* DATE RANGE FILTER PANEL (Hidden for sales which has its own advanced filter section) */}
        {tab !== "sales" && (
          <div className='flex flex-wrap items-center gap-3 bg-white border border-zinc-200 px-4 py-2 rounded-xl shadow-sm'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-zinc-500 shrink-0 select-none'>
                Dari:
              </span>
              <input
                type='date'
                className='input py-1 text-xs'
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
                className='input py-1 text-xs'
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <button
              onClick={fetchReport}
              disabled={loading}
              className='btn btn-primary btn-sm h-8'>
              {loading ? "..." : "Terapkan"}
            </button>
          </div>
        )}
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
        <div className='flex flex-col gap-6 lg:gap-8'>
          {/* THREE SALES SUMMARY METRICS CARDS */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {/* Total Omset Card */}
            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-all duration-300 group'>
              <div className='min-w-0'>
                <span className='text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none'>
                  Total Omset
                </span>
                <p className='text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1.5 break-words'>
                  {formatRupiah(totalOmset)}
                </p>
              </div>
              <div className='w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 transition-transform duration-300 group-hover:scale-105'>
                <Wallet size={22} className='stroke-[2]' />
              </div>
            </div>

            {/* Total Transaksi Card */}
            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-all duration-300 group'>
              <div className='min-w-0'>
                <span className='text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none'>
                  Total Transaksi (SO)
                </span>
                <p className='text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1.5'>
                  {totalTransaksi}
                </p>
              </div>
              <div className='w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 transition-transform duration-300 group-hover:scale-105'>
                <Receipt size={22} className='stroke-[2]' />
              </div>
            </div>

            {/* Rata-rata Transaksi Card */}
            <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-all duration-300 group'>
              <div className='min-w-0'>
                <span className='text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none'>
                  Rata-rata Transaksi
                </span>
                <p className='text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1.5 break-words'>
                  {formatRupiah(rataRataTransaksi)}
                </p>
              </div>
              <div className='w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform duration-300 group-hover:scale-105'>
                <BarChart3 size={22} className='stroke-[2]' />
              </div>
            </div>
          </div>

          {/* FILTERS (DIRECTLY ON BACKGROUND) */}
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6'>
            {/* Pencarian */}
            <div className='space-y-1.5'>
              <label className='text-[10px] font-extrabold text-zinc-850 dark:text-zinc-250 uppercase tracking-wider block'>
                Pencarian
              </label>
              <div className='relative'>
                <Search
                  className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500'
                  size={14}
                />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Cari No SO / Customer...'
                  className='w-full h-10 pl-9 pr-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-medium'
                />
              </div>
            </div>

            {/* Bulan */}
            <div className='space-y-1.5'>
              <label className='text-[10px] font-extrabold text-zinc-850 dark:text-zinc-250 uppercase tracking-wider block'>
                Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className='w-full h-10 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors cursor-pointer select'>
                <option value='all'>Semua Bulan</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun */}
            <div className='space-y-1.5'>
              <label className='text-[10px] font-extrabold text-zinc-850 dark:text-zinc-250 uppercase tracking-wider block'>
                Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className='w-full h-10 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors cursor-pointer select'>
                <option value='all'>Semua Tahun</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer */}
            <div className='space-y-1.5'>
              <label className='text-[10px] font-extrabold text-zinc-850 dark:text-zinc-250 uppercase tracking-wider block'>
                Customer
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className='w-full h-10 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors cursor-pointer select'>
                <option value='all'>Semua Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLE SECTION (DIRECTLY ON BACKGROUND) */}
          <div className='flex flex-col gap-3'>
            {/* Header info */}
            <div className='flex items-end justify-between px-1'>
              <div>
                <h2 className='text-sm font-extrabold uppercase tracking-wider text-zinc-950 dark:text-zinc-50'>
                  Data Sales Order
                </h2>
                <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium'>
                  Menampilkan data transaksi sales order
                </p>
              </div>
              <div className='text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-lg select-none'>
                Total: {filteredSalesOrders.length} data
              </div>
            </div>

            {/* Table Container Card */}
            <div className='border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm'>
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[900px] border-collapse'>
                  <thead>
                    <tr className='bg-[#F9FAFB]/60 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800'>
                      <th className='px-6 py-3.5 text-left text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider'>
                        No. SO
                      </th>
                      <th className='px-6 py-3.5 text-left text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider'>
                        Tanggal
                      </th>
                      <th className='px-6 py-3.5 text-left text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider'>
                        Customer
                      </th>
                      <th className='px-6 py-3.5 text-right text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider'>
                        DPP
                      </th>
                      <th className='px-6 py-3.5 text-right text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider'>
                        PPN
                      </th>
                      <th className='px-6 py-3.5 text-right text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider'>
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody className='divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900'>
                    {filteredSalesOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className='py-20 text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500'>
                          Tidak ada data untuk ditampilkan
                        </td>
                      </tr>
                    ) : (
                      filteredSalesOrders.map((order: any) => (
                        <tr
                          key={order.id}
                          className='hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors duration-150'>
                          <td className='px-6 py-4 text-sm font-bold text-zinc-950 dark:text-zinc-50 whitespace-nowrap'>
                            {order.number}
                          </td>
                          <td className='px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400 font-semibold whitespace-nowrap'>
                            {formatIndoDate(order.orderDate)}
                          </td>
                          <td className='px-6 py-4 text-sm'>
                            <div className='flex flex-col'>
                              <span className='font-bold text-zinc-800 dark:text-zinc-200'>
                                {order.customer?.name || "-"}
                              </span>
                              {order.customer?.parent?.name && (
                                <span className='text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5'>
                                  {order.customer.parent.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className='px-6 py-4 text-sm text-right font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap'>
                            {formatRupiah(order.subtotal || 0)}
                          </td>
                          <td className='px-6 py-4 text-sm text-right font-medium text-zinc-450 dark:text-zinc-450 whitespace-nowrap'>
                            {formatRupiah(order.tax || 0)}
                          </td>
                          <td className='px-6 py-4 text-right whitespace-nowrap'>
                            <span className='inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-350 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100/30 dark:border-teal-900/10'>
                              {formatRupiah(order.total || 0)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className='px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 flex items-center justify-between text-xs font-semibold text-zinc-400 dark:text-zinc-500'>
                <span>Menampilkan {filteredSalesOrders.length} baris</span>
                <span>Diperbarui otomatis</span>
              </div>
            </div>
          </div>
        </div>
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
                <th key={h}>{h}</th>
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
                    <td key={j}>{renderCell(cell)}</td>
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

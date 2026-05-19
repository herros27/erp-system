"use client";

import { useState, useEffect } from "react";
import { useCompanyStore } from "@/stores/company-store";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Truck, Eye, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function SuratJalanPage() {
  const { activeCompany } = useCompanyStore();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Create State
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [selectedSOId, setSelectedSOId] = useState("");
  const [soItems, setSoItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split("T")[0],
    driverName: "",
    licensePlate: "",
    notes: "",
    number: "",
  });
  const [deliveryItems, setDeliveryItems] = useState<any>({}); // { productId: qtyToDeliver }

  // Detail State
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  // Debouncing search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch pending sales orders once on company change
  useEffect(() => {
    if (!activeCompany) return;
    fetchPendingSalesOrders();
  }, [activeCompany]);

  // Fetch Deliveries when company, page, or search query changes
  useEffect(() => {
    if (activeCompany) fetchDeliveries();
  }, [activeCompany, page, search]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/surat-jalan", window.location.origin);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", "10");
      if (search) {
        url.searchParams.set("search", search);
      }

      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: { "x-company-id": activeCompany?.id || "" },
      });
      const json = await res.json();
      if (json.success) {
        setDeliveries(json.data);
        setTotalPages(json.meta?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat Surat Jalan");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSalesOrders = async () => {
    try {
      const res = await fetch("/api/sales/orders?limit=100", {
        cache: "no-store",
        headers: { "x-company-id": activeCompany?.id || "" },
      });
      const json = await res.json();
      if (json.success) {
        const pending = json.data.filter(
          (so: any) => so.status !== "CANCELLED" && so.status !== "COMPLETED",
        );
        setSalesOrders(pending);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModal = () => {
    setSelectedSOId("");
    setSoItems([]);
    setDeliveryItems({});
    setFormData({
      deliveryDate: new Date().toISOString().split("T")[0],
      driverName: "",
      licensePlate: "",
      notes: "",
      number: "",
    });
    setIsModalOpen(true);
  };

  const handleSOChange = (soId: string) => {
    setSelectedSOId(soId);
    const so = salesOrders.find((s) => s.id === soId);
    if (so) {
      setSoItems(so.items);
      // Initialize delivery items with 0
      const initialItems: any = {};
      so.items.forEach((item: any) => {
        initialItems[item.productId] = 0; // User must explicitly say how much to send
      });
      setDeliveryItems(initialItems);
    } else {
      setSoItems([]);
      setDeliveryItems({});
    }
  };

  const handleQtyChange = (
    productId: string,
    value: string,
    maxQty: number,
  ) => {
    let num = parseInt(value);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxQty) num = maxQty;

    setDeliveryItems({
      ...deliveryItems,
      [productId]: num,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Siapkan items
    const itemsToSubmit = [];
    for (const [productId, qty] of Object.entries(deliveryItems)) {
      if ((qty as number) > 0) {
        itemsToSubmit.push({ productId, quantity: qty });
      }
    }

    if (itemsToSubmit.length === 0) {
      return toast.error("Isi minimal 1 kuantitas barang yang akan dikirim");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        salesOrderId: selectedSOId,
        ...formData,
        items: itemsToSubmit,
      };

      const res = await fetch("/api/surat-jalan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": activeCompany?.id || "",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setIsModalOpen(false);
        fetchDeliveries();
        fetchPendingSalesOrders(); // Refresh SO list in case one got completed
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Surat Jalan (SJ)
          </h1>
          <p className='text-sm mt-1 text-gray-500'>
            Kelola pengiriman fisik barang ke pelanggan (Partial/Full Delivery)
          </p>
        </div>
        <button className='btn btn-primary' onClick={handleOpenModal}>
          <Truck size={18} />
          Buat Surat Jalan
        </button>
      </div>

      <div className='card p-5'>
        <div className='flex items-center gap-4 mb-6'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Cari nomor SJ atau SO...'
              className='input pl-10'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className='overflow-x-auto'>
          {loading ? (
            <div className='py-10 text-center text-sm text-gray-500'>
              Memuat data...
            </div>
          ) : deliveries.length === 0 ? (
            <div className='py-12 text-center text-gray-500'>
              <Truck size={48} className='mx-auto mb-4 opacity-20' />
              <p>Belum ada riwayat pengiriman barang</p>
            </div>
          ) : (
            <table className='data-table'>
              <thead>
                <tr>
                  <th>No. SJ</th>
                  <th>Tanggal Kirim</th>
                  <th>Referensi SO</th>
                  <th>Pelanggan</th>
                  <th>Supir</th>
                  <th>Status</th>
                  <th className='text-right'>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((sj) => (
                  <tr key={sj.id}>
                    <td className='font-medium text-gray-900 dark:text-white'>
                      {sj.number}
                    </td>
                    <td>{formatDate(sj.deliveryDate)}</td>
                    <td className='text-blue-600'>{sj.salesOrder?.number}</td>
                    <td>{sj.salesOrder?.customer?.name}</td>
                    <td>
                      {sj.driverName || "-"}{" "}
                      <span className='text-xs text-gray-400 block'>
                        {sj.licensePlate}
                      </span>
                    </td>
                    <td>
                      <span className='badge badge-success'>
                        <CheckCircle2 size={12} className='mr-1' /> Terkirim
                      </span>
                    </td>
                    <td className='text-right'>
                      <button
                        className='btn btn-ghost btn-sm text-blue-600'
                        onClick={() => {
                          setSelectedDelivery(sj);
                          setIsDetailModalOpen(true);
                        }}>
                        <Eye size={16} /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className='p-5 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col sm:flex-row items-center justify-between gap-4 -mx-5 -mb-5 rounded-b-2xl mt-5'>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 font-bold'>
              Halaman {page} dari {totalPages}
            </div>
            <div className='pagination'>
              <button
                type='button'
                onClick={() => setPage(1)}
                disabled={page === 1}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Pertama
              </button>
              <button
                type='button'
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Sebelumnya
              </button>
              <span className='px-4 py-2 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-sm border border-transparent select-none'>
                {page} / {totalPages}
              </span>
              <button
                type='button'
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Selanjutnya
              </button>
              <button
                type='button'
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Terakhir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className='modal-overlay' onClick={() => setIsModalOpen(false)}>
          <div
            className='modal-content max-w-4xl'
            onClick={(e) => e.stopPropagation()}>
            <h2 className='text-xl font-semibold mb-6 text-gray-800 dark:text-white'>
              Buat Surat Jalan Pengiriman
            </h2>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Pilih Sales Order *
                  </label>
                  <select
                    className='input'
                    required
                    value={selectedSOId}
                    onChange={(e) => handleSOChange(e.target.value)}>
                    <option value=''>-- Pilih Pesanan (SO) --</option>
                    {salesOrders.map((so) => (
                      <option key={so.id} value={so.id}>
                        {so.number} - {so.customer.name} (
                        {formatDate(so.orderDate)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Tanggal Pengiriman *
                  </label>
                  <input
                    type='date'
                    className='input'
                    required
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Nama Supir / Kurir
                  </label>
                  <input
                    type='text'
                    className='input'
                    placeholder='Contoh: Budi'
                    value={formData.driverName}
                    onChange={(e) =>
                      setFormData({ ...formData, driverName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    No. Polisi (Plat)
                  </label>
                  <input
                    type='text'
                    className='input'
                    placeholder='Contoh: B 1234 CD'
                    value={formData.licensePlate}
                    onChange={(e) =>
                      setFormData({ ...formData, licensePlate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Nomor SJ (Opsional)
                  </label>
                  <input
                    type='text'
                    className='input font-mono font-bold uppercase'
                    placeholder='Otomatis'
                    value={formData.number}
                    onChange={(e) =>
                      setFormData({ ...formData, number: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Catatan
                  </label>
                  <input
                    type='text'
                    className='input'
                    placeholder='Opsional'
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              {selectedSOId && (
                <div>
                  <h3 className='font-semibold text-gray-800 dark:text-white mb-2 border-b pb-2'>
                    Pilih Barang yang Dikirim
                  </h3>
                  <div className='bg-orange-50 text-orange-800 text-xs p-3 rounded mb-4 border border-orange-200'>
                    Sistem akan memotong stok fisik di gudang sesuai dengan{" "}
                    <strong>Qty Kirim</strong> yang Anda isi di bawah ini.
                  </div>

                  <div className='overflow-x-auto border rounded-lg dark:border-slate-700'>
                    <table className='w-full text-sm text-left'>
                      <thead className='bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'>
                        <tr>
                          <th className='p-3 font-medium'>Produk</th>
                          <th className='p-3 font-medium text-center'>
                            Total Pesanan
                          </th>
                          <th className='p-3 font-medium text-center'>
                            Sudah Terkirim
                          </th>
                          <th className='p-3 font-medium text-center'>
                            Sisa (Belum Kirim)
                          </th>
                          <th className='p-3 font-bold text-blue-700 dark:text-blue-400 w-40 text-center bg-blue-50 dark:bg-slate-700'>
                            Qty Kirim Hari Ini
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {soItems.map((item, index) => {
                          const sisa = item.quantity - item.fulfilledQty;
                          const isDone = sisa <= 0;

                          return (
                            <tr
                              key={index}
                              className='border-t border-gray-200 dark:border-slate-700'>
                              <td className='p-3 text-gray-800 dark:text-gray-200'>
                                {item.product?.name}
                              </td>
                              <td className='p-3 text-center text-gray-600'>
                                {item.quantity}
                              </td>
                              <td className='p-3 text-center text-green-600 font-medium'>
                                {item.fulfilledQty}
                              </td>
                              <td className='p-3 text-center text-red-500 font-medium'>
                                {sisa}
                              </td>
                              <td className='p-2 bg-blue-50 dark:bg-slate-700/50'>
                                {isDone ? (
                                  <div className='text-center text-gray-400 text-xs italic py-2'>
                                    Selesai
                                  </div>
                                ) : (
                                  <input
                                    type='number'
                                    className='input py-1.5 text-center font-bold text-blue-700 bg-white'
                                    min='0'
                                    max={sisa}
                                    value={
                                      deliveryItems[item.productId] === 0
                                        ? ""
                                        : deliveryItems[item.productId]
                                    }
                                    onChange={(e) =>
                                      handleQtyChange(
                                        item.productId,
                                        e.target.value,
                                        sisa,
                                      )
                                    }
                                    placeholder='0'
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className='flex justify-end gap-2 mt-6'>
                <button
                  type='button'
                  className='btn btn-secondary'
                  onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={isSubmitting || !selectedSOId}>
                  {isSubmitting ? "Memproses..." : "Simpan & Potong Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedDelivery && (
        <div
          className='modal-overlay'
          onClick={() => setIsDetailModalOpen(false)}>
          <div
            className='modal-content max-w-4xl'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-start mb-6'>
              <div>
                <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                  Detail Surat Jalan
                </h2>
                <p className='text-sm text-gray-500 mt-1'>
                  {selectedDelivery.number}
                </p>
              </div>
              <button
                className='btn btn-secondary btn-sm flex items-center gap-1 bg-white border-gray-300 text-gray-700'
                onClick={() =>
                  window.open(
                    `/print/surat-jalan/${selectedDelivery.id}`,
                    "_blank",
                  )
                }>
                <Truck size={14} /> Cetak SJ
              </button>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg'>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Tgl Kirim
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {formatDate(selectedDelivery.deliveryDate)}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Referensi SO
                </p>
                <p className='font-medium text-blue-600 dark:text-blue-400'>
                  {selectedDelivery.salesOrder?.number}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Supir / Kendaraan
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {selectedDelivery.driverName || "-"}{" "}
                  {selectedDelivery.licensePlate
                    ? `(${selectedDelivery.licensePlate})`
                    : ""}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Pelanggan
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {selectedDelivery.salesOrder?.customer?.name}
                </p>
              </div>
            </div>

            <h3 className='font-semibold text-gray-800 dark:text-white mb-3'>
              Barang yang Dikirim Fisik
            </h3>
            <div className='overflow-x-auto border rounded-lg dark:border-slate-700 mb-6'>
              <table className='w-full text-sm text-left'>
                <thead className='bg-gray-100 dark:bg-slate-800'>
                  <tr>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium'>
                      No
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium'>
                      Nama Produk
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-center'>
                      Qty Dikirim
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDelivery.items?.map((item: any, idx: number) => (
                    <tr
                      key={item.id}
                      className='border-t border-gray-200 dark:border-slate-700'>
                      <td className='p-3 text-gray-600'>{idx + 1}</td>
                      <td className='p-3 font-medium text-gray-800 dark:text-gray-200'>
                        {item.product?.name}
                      </td>
                      <td className='p-3 text-center font-bold text-gray-900 dark:text-white text-lg'>
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='flex justify-end mt-6'>
              <button
                className='btn btn-secondary'
                onClick={() => setIsDetailModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

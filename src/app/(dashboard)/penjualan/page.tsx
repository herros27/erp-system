"use client";

import { useState, useEffect } from "react";
import { useCompanyStore } from "@/stores/company-store";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Printer,
  Truck,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";

export default function PenjualanPage() {
  const { activeCompany } = useCompanyStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // SO Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<any>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitSONumber, setSplitSONumber] = useState("");
  const [isSplitting, setIsSplitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    customerId: "",
    orderDate: new Date().toISOString().split("T")[0],
    notes: "",
    number: "",
  });

  const [items, setItems] = useState<
    Array<{ productId: string; quantity: number; unitPrice: number }>
  >([{ productId: "", quantity: 1, unitPrice: 0 }]);

  // Calculated totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  // Fetch master data (Customer & Product) hanya saat company berubah
  useEffect(() => {
    if (!activeCompany) return;
    fetchCustomers();
    fetchProducts();
  }, [activeCompany]);

  // Fetch Sales Orders saat company berubah ATAU pencarian berubah ATAU halaman berubah
  useEffect(() => {
    if (!activeCompany) return;

    // Debounce 500ms
    const delayDebounceFn = setTimeout(() => {
      fetchOrders(search, page);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [activeCompany, search, page]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers?limit=100");
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=100");
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (searchQuery: string = "", targetPage: number = page) => {
    setLoading(true);
    try {
      const url = new URL("/api/sales/orders", window.location.origin);
      url.searchParams.append("page", String(targetPage));
      if (searchQuery) {
        url.searchParams.append("search", searchQuery);
      }

      const res = await fetch(url.toString(), {
        headers: {
          "x-company-id": activeCompany?.id || "",
        },
      });
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
        setTotalPages(json.meta?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat sales order");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      customerId: "",
      orderDate: new Date().toISOString().split("T")[0],
      notes: "",
      number: "",
    });
    setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      newItems[index] = {
        ...newItems[index],
        productId: value,
        unitPrice: product?.sellPrice || 0,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate items
    const validItems = items.filter(
      (item) => item.productId && item.quantity > 0,
    );
    if (validItems.length === 0) {
      return toast.error("Tambahkan minimal 1 produk");
    }

    setIsSubmitting(true);
    try {
      const payload = { ...formData, items: validItems };
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setIsModalOpen(false);
        fetchOrders(search, 1);
        setPage(1);
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSplitSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSO) return;
    setIsSplitting(true);
    try {
      const res = await fetch(`/api/sales/orders/${selectedSO.id}/split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": activeCompany?.id || "",
        },
        body: JSON.stringify({
          newNumber: splitSONumber.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setIsSplitModalOpen(false);
        setIsDetailModalOpen(false);
        fetchOrders(search, page);
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Terjadi kesalahan saat memisahkan pesanan");
    } finally {
      setIsSplitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className='badge badge-neutral'>
            <Clock size={12} className='mr-1' /> Draft
          </span>
        );
      case "CONFIRMED":
        return (
          <span className='badge badge-info'>
            <CheckCircle2 size={12} className='mr-1' /> Dikonfirmasi
          </span>
        );
      case "INDENT":
        return (
          <span
            className='badge'
            style={{ backgroundColor: "#f97316", color: "white" }}>
            <Clock size={12} className='mr-1' /> Indent
          </span>
        );
      case "INVOICED":
        return (
          <span className='badge badge-warning'>
            <FileText size={12} className='mr-1' /> Ditagih
          </span>
        );
      case "COMPLETED":
        return (
          <span className='badge badge-success'>
            <CheckCircle2 size={12} className='mr-1' /> Selesai
          </span>
        );
      case "CANCELLED":
        return (
          <span className='badge badge-danger'>
            <XCircle size={12} className='mr-1' /> Dibatalkan
          </span>
        );
      default:
        return <span className='badge badge-neutral'>{status}</span>;
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1
            className='text-2xl font-bold'
            style={{ color: "var(--text-primary)" }}>
            Sales Order
          </h1>
          <p
            className='text-sm mt-1'
            style={{ color: "var(--text-secondary)" }}>
            Kelola pesanan penjualan dari pelanggan
          </p>
        </div>
        <button className='btn btn-primary' onClick={handleOpenModal}>
          <Plus size={18} />
          Buat SO Baru
        </button>
      </div>

      <div className='card p-0 overflow-hidden'>
        <div className='p-5 pb-0'>
          <div className='flex items-center gap-4 mb-6'>
            <div className='relative flex-1 max-w-md'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Cari nomor SO atau pelanggan...'
                className='input pl-10'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className='overflow-x-auto px-5 pb-5'>
          {loading ? (
            <div className='py-10 text-center text-sm text-gray-500'>
              Memuat data...
            </div>
          ) : orders.length === 0 ? (
            <div className='py-12 text-center text-gray-500'>
              <FileText size={48} className='mx-auto mb-4 opacity-20' />
              <p>Belum ada transaksi penjualan</p>
            </div>
          ) : (
            <table className='data-table'>
              <thead>
                <tr>
                  <th>Nomor SO</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className='text-right'>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((so) => (
                  <tr key={so.id}>
                    <td className='font-medium text-blue-600'>{so.number}</td>
                    <td>{formatDate(so.orderDate)}</td>
                    <td>{so.customer.name}</td>
                    <td className='font-medium'>{formatRupiah(so.total)}</td>
                    <td>{getStatusBadge(so.status)}</td>
                    <td className='text-right'>
                      <button
                        className='btn btn-ghost btn-sm text-blue-600'
                        onClick={() => {
                          setSelectedSO(so);
                          setIsDetailModalOpen(true);
                        }}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className='p-5 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-2xl'>
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

      {isModalOpen && (
        <div className='modal-overlay' onClick={() => setIsModalOpen(false)}>
          <div
            className='modal-content max-w-4xl'
            onClick={(e) => e.stopPropagation()}>
            <h2 className='text-xl font-semibold mb-6 text-gray-800 dark:text-white'>
              Buat Sales Order
            </h2>

            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* Header Info */}
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Pelanggan *
                  </label>
                  <select
                    className='input'
                    required
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }>
                    <option value=''>-- Pilih Pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Tanggal Order *
                  </label>
                  <input
                    type='date'
                    className='input'
                    required
                    value={formData.orderDate}
                    onChange={(e) =>
                      setFormData({ ...formData, orderDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Nomor SO (Opsional)
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

              {/* Items */}
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <h3 className='font-semibold text-gray-800 dark:text-white'>
                    Daftar Item
                  </h3>
                  <button
                    type='button'
                    onClick={handleAddItem}
                    className='btn btn-secondary btn-sm'>
                    <Plus size={16} /> Tambah Item
                  </button>
                </div>

                <div className='overflow-x-auto border rounded-lg dark:border-slate-700'>
                  <table className='w-full text-sm text-left'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th className='p-3 text-gray-700 dark:text-gray-300 font-medium'>
                          Produk
                        </th>
                        <th className='p-3 text-gray-700 dark:text-gray-300 font-medium w-32'>
                          Kuantitas
                        </th>
                        <th className='p-3 text-gray-700 dark:text-gray-300 font-medium w-40'>
                          Harga Jual
                        </th>
                        <th className='p-3 text-gray-700 dark:text-gray-300 font-medium w-40 text-right'>
                          Subtotal
                        </th>
                        <th className='p-3 text-gray-700 dark:text-gray-300 font-medium w-16 text-center'>
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          key={index}
                          className='border-t border-gray-100 dark:border-slate-700'>
                          <td className='p-2'>
                            <select
                              className='input py-1.5'
                              value={item.productId}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "productId",
                                  e.target.value,
                                )
                              }
                              required>
                              <option value=''>Pilih...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className='p-2'>
                            <input
                              type='number'
                              className='input py-1.5'
                              min='1'
                              value={item.quantity || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  Number(e.target.value),
                                )
                              }
                              required
                            />
                          </td>
                          <td className='p-2'>
                            <input
                              type='number'
                              className='input py-1.5'
                              min='0'
                              value={item.unitPrice === 0 ? "" : item.unitPrice}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "unitPrice",
                                  Number(e.target.value),
                                )
                              }
                              required
                            />
                          </td>
                          <td className='p-2 text-right font-medium text-gray-800 dark:text-gray-200'>
                            {formatRupiah(item.quantity * item.unitPrice)}
                          </td>
                          <td className='p-2 text-center'>
                            <button
                              type='button'
                              onClick={() => handleRemoveItem(index)}
                              className='text-red-500 hover:text-red-700 p-1'>
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className='flex justify-end border-t pt-4 dark:border-slate-700'>
                <div className='w-64 space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-500 dark:text-gray-400'>
                      Subtotal:
                    </span>
                    <span className='font-medium text-gray-800 dark:text-gray-200'>
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-500 dark:text-gray-400'>
                      PPN (11%):
                    </span>
                    <span className='font-medium text-gray-800 dark:text-gray-200'>
                      {formatRupiah(tax)}
                    </span>
                  </div>
                  <div className='flex justify-between text-lg font-bold'>
                    <span className='text-gray-800 dark:text-white'>
                      Total:
                    </span>
                    <span className='text-blue-600 dark:text-blue-400'>
                      {formatRupiah(total)}
                    </span>
                  </div>
                </div>
              </div>

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
                  disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan SO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedSO && (
        <div
          className='modal-overlay'
          onClick={() => setIsDetailModalOpen(false)}>
          <div
            className='modal-content max-w-4xl'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-start mb-6'>
              <div>
                <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                  Detail Sales Order
                </h2>
                <p className='text-sm text-gray-500 mt-1'>
                  {selectedSO.number}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <div className='text-right mr-3'>
                  <p className='text-xs text-gray-500 mb-1'>Status Pesanan</p>
                  {getStatusBadge(selectedSO.status)}
                </div>
                <button
                  className='btn btn-primary btn-sm flex items-center gap-1'
                  onClick={() =>
                    window.open(`/print/sales-order/${selectedSO.id}`, "_blank")
                  }
                  title='Cetak Sales Order Lengkap'>
                  <Printer size={14} /> Cetak SO
                </button>
              </div>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg'>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Pelanggan
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {selectedSO.customer?.name}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Tanggal Order
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {formatDate(selectedSO.orderDate)}
                </p>
              </div>
              <div className='col-span-2'>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Catatan
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {selectedSO.notes || "-"}
                </p>
              </div>
            </div>

            <h3 className='font-semibold text-gray-800 dark:text-white mb-3'>
              Daftar Item
            </h3>
            <div className='overflow-x-auto border rounded-lg dark:border-slate-700 mb-6'>
              <table className='w-full text-sm text-left'>
                <thead className='bg-gray-50 dark:bg-slate-800'>
                  <tr>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium'>
                      Produk
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-center'>
                      Pesanan
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-center text-green-600'>
                      Terpenuhi
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-center text-orange-500'>
                      Indent
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-right'>
                      Harga Jual
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-right'>
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSO.items?.map((item: any) => (
                    <tr
                      key={item.id}
                      className='border-t border-gray-100 dark:border-slate-700'>
                      <td className='p-3 font-medium text-gray-800 dark:text-gray-200'>
                        {item.product?.name}
                      </td>
                      <td className='p-3 text-center text-gray-800 dark:text-gray-200'>
                        {item.quantity}
                      </td>
                      <td className='p-3 text-center font-bold text-green-600'>
                        {item.fulfilledQty || 0}
                      </td>
                      <td className='p-3 text-center font-bold text-orange-500'>
                        {item.indentQty > 0 ? item.indentQty : 0}
                      </td>
                      <td className='p-3 text-right text-gray-800 dark:text-gray-200'>
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className='p-3 text-right font-medium text-gray-800 dark:text-gray-200'>
                        {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='flex justify-end border-t pt-4 dark:border-slate-700'>
              <div className='w-64 space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500 dark:text-gray-400'>
                    Subtotal:
                  </span>
                  <span className='font-medium text-gray-800 dark:text-gray-200'>
                    {formatRupiah(selectedSO.subtotal)}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500 dark:text-gray-400'>
                    PPN (11%):
                  </span>
                  <span className='font-medium text-gray-800 dark:text-gray-200'>
                    {formatRupiah(selectedSO.tax)}
                  </span>
                </div>
                <div className='flex justify-between text-lg font-bold'>
                  <span className='text-gray-800 dark:text-white'>Total:</span>
                  <span className='text-blue-600 dark:text-blue-400'>
                    {formatRupiah(selectedSO.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex justify-between items-center mt-6 border-t pt-4 dark:border-slate-700 w-full'>
              <div>
                {selectedSO.status !== "CANCELLED" &&
                  selectedSO.status !== "COMPLETED" &&
                  selectedSO.items?.some(
                    (item: any) =>
                      item.quantity - (item.fulfilledQty || 0) > 0,
                  ) && (
                    <button
                      className='btn btn-secondary text-orange-600 border-orange-200 dark:border-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold flex items-center gap-1'
                      onClick={() => {
                        setSplitSONumber("");
                        setIsSplitModalOpen(true);
                      }}>
                      <Scissors size={14} /> Split Sisa Pesanan
                    </button>
                  )}
              </div>
              <div className='flex gap-2'>
                <button
                  className='btn btn-secondary'
                  onClick={() => setIsDetailModalOpen(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSplitModalOpen && selectedSO && (
        <div
          className='modal-overlay'
          onClick={() => setIsSplitModalOpen(false)}
          style={{ zIndex: 110 }}>
          <div
            className='modal-content max-w-md'
            onClick={(e) => e.stopPropagation()}>
            <h2 className='text-xl font-semibold mb-3 text-gray-800 dark:text-white'>
              Split & Rollover Sisa Pesanan
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
              Tindakan ini akan memindahkan seluruh sisa barang outstanding
              (belum dikirim) dari SO lama <strong>{selectedSO.number}</strong>{" "}
              ke Sales Order baru. SO lama akan otomatis diubah statusnya
              menjadi <strong>Selesai (Completed)</strong>.
            </p>

            <form onSubmit={handleSplitSO} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                  Nomor SO Baru (Opsional)
                </label>
                <input
                  type='text'
                  className='input font-mono font-bold uppercase w-full'
                  placeholder='Otomatis'
                  value={splitSONumber}
                  onChange={(e) =>
                    setSplitSONumber(e.target.value.toUpperCase())
                  }
                />
                <span className='text-xs text-gray-400 mt-1 block'>
                  Biarkan kosong untuk menggunakan nomor berurutan otomatis (contoh: 26005002)
                </span>
              </div>

              <div className='flex justify-end gap-2 mt-6'>
                <button
                  type='button'
                  className='btn btn-secondary'
                  disabled={isSplitting}
                  onClick={() => setIsSplitModalOpen(false)}>
                  Batal
                </button>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={isSplitting}>
                  {isSplitting ? "Memproses..." : "Split Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
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
  Package,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function PembelianPage() {
  const { activeCompany } = useCompanyStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PO Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState("");
  const [receiveItems, setReceiveItems] = useState<Array<{ productId: string; quantity: number }>>([]);

  const [formData, setFormData] = useState({
    supplierId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDate: "",
    notes: "",
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

  // Debouncing search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch master data (Supplier & Product) hanya saat company berubah
  useEffect(() => {
    if (!activeCompany) return;
    fetchSuppliers();
    fetchProducts();
    fetchWarehouses();
  }, [activeCompany]);

  // Fetch Orders saat company berubah, pencarian berubah, atau halaman berubah
  useEffect(() => {
    if (activeCompany) fetchOrders();
  }, [activeCompany, search, page]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers?limit=100", {
        cache: "no-store",
        headers: { "x-company-id": activeCompany?.id || "" }
      });
      const json = await res.json();
      if (json.success) setSuppliers(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=100", {
        cache: "no-store",
        headers: { "x-company-id": activeCompany?.id || "" }
      });
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/warehouses?limit=100", {
        cache: "no-store",
        headers: { "x-company-id": activeCompany?.id || "" }
      });
      const json = await res.json();
      if (json.success) setWarehouses(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openReceiveModal = (po: any) => {
    setReceiveWarehouseId(warehouses[0]?.id || "");
    setReceiveItems(
      po.items.map((item: any) => ({
        productId: item.productId,
        quantity: Math.max(0, item.quantity - (item.receivedQty || 0)),
      })).filter((i: { quantity: number }) => i.quantity > 0)
    );
    setIsReceiveModalOpen(true);
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !receiveWarehouseId) return;
    setIsSubmitting(true);
    try {
      const validItems = receiveItems.filter((i) => i.quantity > 0);
      if (validItems.length === 0) {
        toast.error("Tidak ada kuantitas yang diterima");
        return;
      }
      const res = await fetch("/api/purchasing/goods-receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": activeCompany?.id || "",
        },
        body: JSON.stringify({
          purchaseOrderId: selectedPO.id,
          warehouseId: receiveWarehouseId,
          items: validItems,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setIsReceiveModalOpen(false);
        setIsDetailModalOpen(false);
        fetchOrders();
      } else toast.error(json.message);
    } catch {
      toast.error("Gagal menerima barang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/purchasing/orders", window.location.origin);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", "10");
      if (search) {
        url.searchParams.set("search", search);
      }

      const res = await fetch(url.toString(), {
        cache: "no-store",
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
      toast.error("Gagal memuat purchase order");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      supplierId: "",
      orderDate: new Date().toISOString().split("T")[0],
      expectedDate: "",
      notes: "",
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
        unitPrice: product?.buyPrice || 0,
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
      const res = await fetch("/api/purchasing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setIsModalOpen(false);
        fetchOrders();
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPO = async (id: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin mengkonfirmasi PO ini? Setelah dikonfirmasi, status tidak bisa kembali ke DRAFT.",
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/purchasing/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": activeCompany?.id || "",
        },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setIsDetailModalOpen(false);
        fetchOrders();
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Terjadi kesalahan saat mengkonfirmasi PO");
    } finally {
      setIsSubmitting(false);
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
      case "RECEIVED":
        return (
          <span className='badge badge-success'>
            <CheckCircle2 size={12} className='mr-1' /> Diterima
          </span>
        );
      case "PARTIAL_RECEIVED":
        return (
          <span className='badge badge-warning'>
            <Package size={12} className='mr-1' /> Sebagian Diterima
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
            Purchase Order
          </h1>
          <p
            className='text-sm mt-1'
            style={{ color: "var(--text-secondary)" }}>
            Kelola pesanan pembelian ke supplier
          </p>
        </div>
        <button className='btn btn-primary' onClick={handleOpenModal}>
          <Plus size={18} />
          Buat PO Baru
        </button>
      </div>

      <div className='card p-5'>
        <div className='flex items-center gap-4 mb-6'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Cari nomor PO atau supplier...'
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
          ) : orders.length === 0 ? (
            <div className='py-12 text-center text-gray-500'>
              <FileText size={48} className='mx-auto mb-4 opacity-20' />
              <p>Belum ada transaksi pembelian</p>
            </div>
          ) : (
            <table className='data-table'>
              <thead>
                <tr>
                  <th>Nomor PO</th>
                  <th>Tanggal</th>
                  <th>Supplier</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className='text-right'>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id}>
                    <td className='font-medium text-blue-600'>{po.number}</td>
                    <td>{formatDate(po.orderDate)}</td>
                    <td>{po.supplier.name}</td>
                    <td className='font-medium'>{formatRupiah(po.total)}</td>
                    <td>{getStatusBadge(po.status)}</td>
                    <td className='text-right'>
                      <button
                        className='btn btn-ghost btn-sm text-blue-600'
                        onClick={() => {
                          setSelectedPO(po);
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

      {isModalOpen && (
        <div className='modal-overlay' onClick={() => setIsModalOpen(false)}>
          <div
            className='modal-content max-w-4xl'
            onClick={(e) => e.stopPropagation()}>
            <h2 className='text-xl font-semibold mb-6 text-gray-800 dark:text-white'>
              Buat Purchase Order
            </h2>

            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* Header Info */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                    Supplier *
                  </label>
                  <select
                    className='input'
                    required
                    value={formData.supplierId}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierId: e.target.value })
                    }>
                    <option value=''>-- Pilih Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
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
                    Estimasi Tiba
                  </label>
                  <input
                    type='date'
                    className='input'
                    value={formData.expectedDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedDate: e.target.value })
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
                          Harga Satuan
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
                  {isSubmitting ? "Menyimpan..." : "Simpan PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedPO && (
        <div
          className='modal-overlay'
          onClick={() => setIsDetailModalOpen(false)}>
          <div
            className='modal-content max-w-4xl'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-start mb-6'>
              <div>
                <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                  Detail Purchase Order
                </h2>
                <p className='text-sm text-gray-500 mt-1'>
                  {selectedPO.number}
                </p>
              </div>
              <div>{getStatusBadge(selectedPO.status)}</div>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg'>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Supplier
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {selectedPO.supplier?.name}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Tanggal Order
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {formatDate(selectedPO.orderDate)}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Estimasi Tiba
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {selectedPO.expectedDate
                    ? formatDate(selectedPO.expectedDate)
                    : "-"}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                  Catatan
                </p>
                <p className='font-medium text-gray-800 dark:text-white'>
                  {selectedPO.notes || "-"}
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
                      Kuantitas
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-right'>
                      Harga Satuan
                    </th>
                    <th className='p-3 text-gray-700 dark:text-gray-300 font-medium text-right'>
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items?.map((item: any) => (
                    <tr
                      key={item.id}
                      className='border-t border-gray-100 dark:border-slate-700'>
                      <td className='p-3 font-medium text-gray-800 dark:text-gray-200'>
                        {item.product?.name}
                      </td>
                      <td className='p-3 text-center text-gray-800 dark:text-gray-200'>
                        {item.receivedQty || 0} / {item.quantity}
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
                    {formatRupiah(selectedPO.subtotal)}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500 dark:text-gray-400'>
                    PPN (11%):
                  </span>
                  <span className='font-medium text-gray-800 dark:text-gray-200'>
                    {formatRupiah(selectedPO.tax)}
                  </span>
                </div>
                <div className='flex justify-between text-lg font-bold'>
                  <span className='text-gray-800 dark:text-white'>Total:</span>
                  <span className='text-blue-600 dark:text-blue-400'>
                    {formatRupiah(selectedPO.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex justify-end gap-2 mt-6'>
              <button
                className='btn btn-secondary'
                onClick={() => setIsDetailModalOpen(false)}>
                Tutup
              </button>
              <a href={`/print/purchase-order/${selectedPO.id}`} target='_blank' rel='noopener noreferrer' className='btn btn-secondary'>
                <Printer size={18} className='mr-2' /> Cetak
              </a>
              {selectedPO.status === "DRAFT" && (
                <button className='btn btn-primary' onClick={() => handleConfirmPO(selectedPO.id)} disabled={isSubmitting}>
                  <CheckCircle2 size={18} className='mr-2' /> Konfirmasi PO
                </button>
              )}
              {["CONFIRMED", "PARTIAL_RECEIVED"].includes(selectedPO.status) && (
                <button className='btn btn-primary' onClick={() => openReceiveModal(selectedPO)} disabled={isSubmitting}>
                  <Package size={18} className='mr-2' /> Terima Barang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isReceiveModalOpen && selectedPO && (
        <div className='modal-overlay' onClick={() => setIsReceiveModalOpen(false)}>
          <div className='modal-content max-w-2xl' onClick={(e) => e.stopPropagation()}>
            <h2 className='text-xl font-semibold mb-4'>Penerimaan Barang — {selectedPO.number}</h2>
            <form onSubmit={handleReceiveGoods} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>Gudang Tujuan</label>
                <select className='input' required value={receiveWarehouseId} onChange={(e) => setReceiveWarehouseId(e.target.value)}>
                  <option value=''>Pilih gudang...</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <table className='w-full text-sm border rounded-lg'>
                <thead className='bg-gray-50 dark:bg-slate-800'><tr><th className='text-left p-2'>Produk</th><th className='p-2'>Sisa</th><th className='p-2'>Terima</th></tr></thead>
                <tbody>
                  {selectedPO.items?.map((item: any) => {
                    const remaining = item.quantity - (item.receivedQty || 0);
                    const ri = receiveItems.find((x) => x.productId === item.productId);
                    if (remaining <= 0) return null;
                    return (
                      <tr key={item.id} className='border-t'>
                        <td className='p-2'>{item.product?.name}</td>
                        <td className='p-2 text-center'>{remaining}</td>
                        <td className='p-2'>
                          <input type='number' className='input py-1 w-24' min={0} max={remaining} value={ri?.quantity ?? 0}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              setReceiveItems((prev) => {
                                const idx = prev.findIndex((x) => x.productId === item.productId);
                                const next = [...prev];
                                if (idx >= 0) next[idx] = { productId: item.productId, quantity: qty };
                                else next.push({ productId: item.productId, quantity: qty });
                                return next;
                              });
                            }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className='flex justify-end gap-2'>
                <button type='button' className='btn btn-secondary' onClick={() => setIsReceiveModalOpen(false)}>Batal</button>
                <button type='submit' className='btn btn-primary' disabled={isSubmitting}>{isSubmitting ? 'Memproses...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

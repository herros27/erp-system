"use client";

import { useState, useEffect } from "react";
import { useCompanyStore } from "@/stores/company-store";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  CheckCircle2,
  FileUp,
  X,
  CreditCard,
  ExternalLink,
  Image as ImageIcon,
  Receipt,
  Trash2,
  Edit,
  Eye,
  ArrowRightCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function PembayaranPage() {
  const { activeCompany } = useCompanyStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState("");

  // Pending Invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    method: "Transfer Bank",
    notes: "",
  });

  // Attachments State
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const docTypes = [
    "Gambar Surat Jalan",
    "SO",
    "PO",
    "MEMO",
    "SJ Supir",
    "Tanda Terima",
    "Bukti Transfer",
    "Mutasi",
  ];

  // Detail State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentAttachments, setPaymentAttachments] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch pending invoices hanya saat company berubah
  useEffect(() => {
    if (!activeCompany) return;
    fetchPendingInvoices();
  }, [activeCompany]);

  // Fetch payments saat company berubah ATAU kolom search diisi (dengan Debounce)
  useEffect(() => {
    if (!activeCompany) return;

    // Tunggu 500ms setelah user selesai mengetik baru lakukan request API
    const delayDebounceFn = setTimeout(() => {
      fetchPayments(search);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [activeCompany, search]);

  const fetchPayments = async (searchQuery: string = "") => {
    setLoading(true);
    try {
      // Tambahkan query parameter search ke endpoint URL
      const url = new URL("/api/payments", window.location.origin);
      if (searchQuery) {
        url.searchParams.append("search", searchQuery);
      }

      const res = await fetch(url.toString(), {
        headers: { "x-company-id": activeCompany?.id || "" },
      });

      const json = await res.json();
      if (json.success) setPayments(json.data);
    } catch (err) {
      toast.error("Gagal memuat pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvoices = async () => {
    try {
      const res = await fetch("/api/invoices?limit=100", {
        headers: { "x-company-id": activeCompany?.id || "" },
      });
      const json = await res.json();
      if (json.success) {
        const pending = json.data.filter(
          (inv: any) => inv.status !== "PAID" && inv.status !== "CANCELLED",
        );
        setInvoices(pending);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvoiceSelect = (id: string) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      const remaining = inv.total - (inv.paidAmount || 0);
      setFormData((prev) => ({ ...prev, amount: remaining.toString() }));
    } else {
      setFormData((prev) => ({ ...prev, amount: "" }));
    }
  };

  const handleSpecificFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(docType);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (json.success) {
        setAttachments((prev) => {
          const filtered = prev.filter((a) => a.docType !== docType);
          return [
            ...filtered,
            {
              docType,
              fileUrl: json.data.fileUrl,
              fileName: json.data.fileName,
            },
          ];
        });
        toast.success(`File ${docType} berhasil diunggah`);
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error(`Gagal mengunggah file ${docType}`);
    } finally {
      setUploadingType(null);
      if (e.target) e.target.value = "";
    }
  };

  const removeAttachment = (docType: string) => {
    setAttachments(attachments.filter((a) => a.docType !== docType));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoiceId) return toast.error("Pilih Invoice terlebih dahulu");
    if (Number(formData.amount) <= 0)
      return toast.error("Nominal harus lebih dari 0");

    setIsSubmitting(true);
    try {
      const payload = {
        id: editMode ? editId : undefined,
        invoiceId: selectedInvoiceId,
        ...formData,
        amount: Number(formData.amount),
        attachments,
      };

      const method = editMode ? "PUT" : "POST";
      const res = await fetch("/api/payments", {
        method,
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
        fetchPayments(search);
        fetchPendingInvoices();
        setSelectedInvoiceId("");
        setFormData({
          paymentDate: new Date().toISOString().split("T")[0],
          amount: "",
          method: "Transfer Bank",
          notes: "",
        });
        setAttachments([]);
        setEditMode(false);
        setEditId("");
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = async (payment: any) => {
    setSelectedInvoiceId(payment.invoiceId);
    setFormData({
      paymentDate: new Date(payment.paymentDate).toISOString().split("T")[0],
      amount: payment.amount.toString(),
      method: payment.method,
      notes: payment.notes || "",
    });
    setEditMode(true);
    setEditId(payment.id);
    setAttachments([]);
    setIsModalOpen(true);

    try {
      const res = await fetch(
        `/api/attachments?entityType=PAYMENT&entityId=${payment.id}`,
        {
          headers: { "x-company-id": activeCompany?.id || "" },
        },
      );
      const json = await res.json();
      if (json.success) setAttachments(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  const openPayShortfall = (payment: any) => {
    if (
      payment.invoice?.status === "PAID" ||
      payment.invoice?.status === "CANCELLED"
    )
      return;

    setEditMode(false);
    setEditId("");
    setSelectedInvoiceId(payment.invoiceId);
    const remaining = payment.invoice.total - (payment.invoice.paidAmount || 0);
    setFormData({
      paymentDate: new Date().toISOString().split("T")[0],
      amount: remaining.toString(),
      method: "Transfer Bank",
      notes: "",
    });
    setAttachments([]);
    setIsModalOpen(true);
  };

  const openDetail = async (payment: any) => {
    setSelectedPayment(payment);
    setPaymentAttachments([]);
    setIsDetailModalOpen(true);

    try {
      const res = await fetch(
        `/api/attachments?invoiceIdForPayments=${payment.invoiceId}`,
        {
          headers: { "x-company-id": activeCompany?.id || "" },
        },
      );
      const json = await res.json();
      if (json.success) setPaymentAttachments(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const paginatedPayments = payments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className='space-y-8 animate-in fade-in duration-300'>
      {/* HEADER SECTION */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-14 p-10 rounded-2xl'>
        <div className='flex items-center gap-4'>
          <div className='p-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl'>
            <Receipt size={28} />
          </div>
          <div>
            <h1 className='text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white'>
              Pembayaran
            </h1>
            <p className='text-sm mt-1 text-zinc-500 dark:text-zinc-400'>
              Catat dan kelola penerimaan uang / pelunasan dari pelanggan
            </p>
          </div>
        </div>
        <button
          className='h-10 bg-zinc-950 hover:bg-zinc-900 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-3 '
          onClick={() => {
            setEditMode(false);
            setEditId("");
            setSelectedInvoiceId("");
            setAttachments([]);
            setIsModalOpen(true);
          }}>
          <Plus size={18} />
          <span>Terima Pembayaran</span>
        </button>
      </div>

      {/* DATA SECTION */}
      <div className='card p-0 overflow-hidden border border-zinc-100 dark:border-zinc-850 shadow-sm rounded-2xl bg-white dark:bg-zinc-900'>
        <div className='p-5 border-b border-zinc-100 dark:border-zinc-850'>
          {/* Wrapper Flexbox untuk Search Bar */}
          <div className='flex items-center gap-3 px-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus-within:ring-2 focus-within:ring-zinc-950 focus-within:border-zinc-950 dark:focus-within:ring-zinc-200 transition-all max-w-md w-full'>
            <Search className='w-5 h-5 text-zinc-400 shrink-0' />
            <input
              type='text'
              placeholder='Cari No Pembayaran / Invoice...'
              className='w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 text-zinc-900 dark:text-white'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className='overflow-x-auto'>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-20 text-zinc-500'>
              <div className='w-8 h-8 border-2 border-zinc-950 dark:border-white border-t-transparent rounded-full animate-spin mb-4'></div>
              <p className='text-sm font-medium'>Memuat data pembayaran...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className='py-20 flex flex-col items-center text-center px-4'>
              <div className='w-20 h-20 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mb-4 border border-dashed border-zinc-200 dark:border-zinc-800'>
                <CreditCard size={32} className='text-zinc-400' />
              </div>
              <h3 className='text-lg font-bold text-zinc-900 dark:text-white mb-1'>
                Belum ada pembayaran
              </h3>
              <p className='text-sm text-zinc-500 max-w-sm mb-6'>
                Anda belum mencatat penerimaan pembayaran apapun. Klik tombol di
                bawah untuk mulai mencatat.
              </p>
              <button
                className='px-5 py-2.5 bg-white border border-dashed border-zinc-200 hover:bg-zinc-50 text-zinc-950 text-sm font-semibold rounded-xl transition-colors flex items-center'
                onClick={() => setIsModalOpen(true)}>
                <Plus size={16} className='mr-2' />
                Catat Pembayaran Pertama
              </button>
            </div>
          ) : (
            <table className='w-full text-sm text-left'>
              <thead className='text-xs text-zinc-500 uppercase bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-850'>
                <tr>
                  <th className='px-6 py-4 font-bold'>No. Referensi</th>
                  <th className='px-6 py-4 font-bold'>Tanggal</th>
                  <th className='px-6 py-4 font-bold'>Invoice & SO</th>
                  <th className='px-6 py-4 font-bold'>Pelanggan</th>
                  <th className='px-6 py-4 font-bold'>Metode</th>
                  <th className='px-6 py-4 font-bold text-right'>
                    Nominal Masuk
                  </th>
                  <th className='px-6 py-4 font-bold text-center'>Aksi</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-100 dark:divide-zinc-850'>
                {paginatedPayments.map((p) => (
                  <tr
                    key={p.id}
                    className='hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors'>
                    <td className='px-6 py-4 font-bold text-zinc-900 dark:text-white'>
                      {p.number}
                    </td>
                    <td className='px-6 py-4 text-zinc-500 dark:text-zinc-400 font-medium'>
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='font-bold text-zinc-950 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer'>
                        {p.invoice?.number}
                      </div>
                      <div className='text-xs text-zinc-400 mt-0.5 font-medium'>
                        {p.invoice?.salesOrder?.number || "-"}
                      </div>
                    </td>
                    <td className='px-6 py-4 text-zinc-700 dark:text-zinc-300 font-medium'>
                      {p.invoice?.customer?.name}
                    </td>
                    <td className='px-6 py-4'>
                      <span className='inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'>
                        {p.method}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <span className='font-bold text-zinc-950 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 px-3 py-1.5 rounded-xl inline-block shadow-sm'>
                        {formatRupiah(p.amount)}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center justify-center gap-1.5'>
                        <button
                          className='p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'
                          onClick={() => openDetail(p)}
                          title='Detail'>
                          <Eye size={18} />
                        </button>
                        <button
                          className='p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'
                          onClick={() => openEdit(p)}
                          title='Edit'>
                          <Edit size={18} />
                        </button>
                        <button
                          className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                            p.invoice?.status === "PAID" ||
                            p.invoice?.status === "CANCELLED"
                              ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-40"
                              : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                          title={
                            p.invoice?.status === "PAID"
                              ? "Tagihan Lunas"
                              : "Bayar Kekurangan"
                          }
                          onClick={() => openPayShortfall(p)}
                          disabled={
                            p.invoice?.status === "PAID" ||
                            p.invoice?.status === "CANCELLED"
                          }>
                          <ArrowRightCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && payments.length > itemsPerPage && (
          <div className='p-5 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col sm:flex-row items-center justify-between gap-4'>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 font-bold'>
              Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, payments.length)}-
              {Math.min(currentPage * itemsPerPage, payments.length)} dari {payments.length} transaksi
            </div>
            <div className='pagination'>
              <button
                type='button'
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Pertama
              </button>
              <button
                type='button'
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Sebelumnya
              </button>
              <span className='px-4 py-2 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-sm border border-transparent select-none'>
                {currentPage} / {totalPages}
              </span>
              <button
                type='button'
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Selanjutnya
              </button>
              <button
                type='button'
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Terakhir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL TERIMA PEMBAYARAN / EDIT */}
      {isModalOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/60 backdrop-blur-md transition-opacity'
          onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div
            className='bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-zinc-150 dark:border-zinc-800'
            onClick={(e) => e.stopPropagation()}>
            
            {/* MODAL HEADER */}
            <div className='bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800/80 px-8 py-6 flex items-center justify-between shrink-0 select-none'>
              <h2 className='text-xl font-black text-zinc-900 dark:text-white flex items-center gap-3'>
                <div className='p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl'>
                  <Receipt size={20} />
                </div>
                {editMode ? "Koreksi Catatan Pembayaran" : "Penerimaan Pembayaran Baru"}
              </h2>
              <button
                type='button'
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className='p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className='flex-1 overflow-y-auto flex flex-col'>
              
              <div className='p-8 md:p-10 space-y-7 flex-1 overflow-y-auto'>
                
                {/* SECTION 1: INVOICE SELECTION */}
                <div className='space-y-2'>
                  <label className='block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none'>
                    Pilih Invoice (Belum Lunas) <span className='text-red-500'>*</span>
                  </label>
                  <select
                    className='w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl transition-all outline-none text-zinc-800 dark:text-zinc-100 font-bold text-xs select-none cursor-pointer focus:ring-2 focus:ring-blue-500/20'
                    required
                    disabled={editMode}
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}>
                    <option value=''>-- Pilih Faktur Penagihan --</option>
                    {invoices.map((inv) => {
                      const remaining = inv.total - (inv.paidAmount || 0);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.number} - {inv.customer.name} (Sisa: {formatRupiah(remaining)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* SECTION 2: DATE & PAYMENT METHOD */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-2'>
                    <label className='block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none'>
                      Tanggal Terima <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='date'
                      className='w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl transition-all outline-none text-zinc-800 dark:text-zinc-100 font-bold text-xs focus:ring-2 focus:ring-blue-500/20'
                      required
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className='space-y-2'>
                    <label className='block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none'>
                      Metode Pembayaran <span className='text-red-500'>*</span>
                    </label>
                    <select
                      className='w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl transition-all outline-none text-zinc-800 dark:text-zinc-100 font-bold text-xs cursor-pointer focus:ring-2 focus:ring-blue-500/20'
                      required
                      value={formData.method}
                      onChange={(e) =>
                        setFormData({ ...formData, method: e.target.value })
                      }>
                      <option value='Transfer Bank'>Transfer Bank</option>
                      <option value='Tunai / Cash'>Tunai / Cash</option>
                      <option value='Giro / Cek'>Giro / Cek</option>
                      <option value='Kartu Kredit'>Kartu Kredit</option>
                    </select>
                  </div>
                </div>

                {/* SECTION 3: NOMINAL DISPLAY (SPACIOUS & BEAUTIFUL) */}
                <div className='p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl space-y-3 shadow-inner'>
                  <label className='block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none'>
                    Nominal Diterima <span className='text-red-500'>*</span>
                  </label>
                  <div className='flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm'>
                    <span className='flex items-center px-4 bg-zinc-100 dark:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800 text-zinc-400 font-black text-sm select-none'>
                      Rp
                    </span>
                    <input
                      type='number'
                      className='w-full px-4 py-3.5 bg-white dark:bg-zinc-900 outline-none text-2xl font-black text-zinc-950 dark:text-white disabled:opacity-60'
                      required
                      min='1'
                      disabled={editMode}
                      value={formData.amount}
                      placeholder='0'
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                    />
                  </div>
                  <p className='text-[10px] font-bold text-zinc-400 italic select-none'>
                    {editMode
                      ? "* Nominal dana tidak dapat diedit langsung demi integritas data."
                      : "* Pastikan nominal sesuai dengan mutasi bank atau uang fisik yang diterima."}
                  </p>
                </div>

                {/* SECTION 4: NOTES */}
                <div className='space-y-2'>
                  <label className='block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none'>
                    Catatan Referensi
                  </label>
                  <input
                    type='text'
                    className='w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl transition-all outline-none text-zinc-800 dark:text-zinc-100 font-bold text-xs focus:ring-2 focus:ring-blue-500/20'
                    placeholder='Misal: Nomor Ref BCA / Diterima oleh staf A'
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>

                {/* SECTION 5: ATTACHMENTS (8 SPECIFIC DOCS CARDS - COMPACT & SPACIOUS) */}
                <div className='space-y-4 pt-4'>
                  <div className='flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2 select-none'>
                    <div>
                      <h3 className='text-sm font-black text-zinc-900 dark:text-white'>
                        Dokumen Pelengkap
                      </h3>
                      <p className='text-[10px] text-zinc-450 font-bold uppercase tracking-wider mt-0.5'>
                        Unggah bukti transaksi pendukung jika ada (Maks. 5MB)
                      </p>
                    </div>
                    <span className='px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-extrabold'>
                      {attachments.length} Terunggah
                    </span>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {docTypes.map((docType) => {
                      const existingAtt = attachments.find(
                        (a) => a.docType === docType,
                      );
                      const isUploadingThis = uploadingType === docType;

                      return (
                        <div
                          key={docType}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            existingAtt
                              ? "bg-zinc-50/50 border-zinc-300 dark:bg-zinc-900/30 dark:border-zinc-800 shadow-sm"
                              : "bg-white border-zinc-200 hover:border-zinc-300/80 dark:bg-zinc-900 dark:border-zinc-850 hover:bg-zinc-50/30"
                          }`}>
                          
                          <div className='flex items-center gap-3 overflow-hidden'>
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                existingAtt
                                  ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-500"
                              }`}>
                              {existingAtt ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <FileUp size={16} />
                              )}
                            </div>
                            
                            <div className='overflow-hidden space-y-0.5'>
                              <p
                                className={`text-xs font-extrabold truncate ${
                                  existingAtt ? "text-zinc-950 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                                }`}>
                                {docType}
                              </p>
                              {existingAtt && (
                                <a
                                  href={existingAtt.fileUrl}
                                  target='_blank'
                                  rel='noreferrer'
                                  className='text-[10px] text-zinc-500 dark:text-zinc-400 font-bold hover:underline inline-flex items-center gap-0.5'>
                                  Lihat File <ExternalLink size={9} />
                                </a>
                              )}
                            </div>
                          </div>

                          <div>
                            {existingAtt ? (
                              <button
                                type='button'
                                onClick={() => removeAttachment(docType)}
                                className='text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2 rounded-xl transition-all'
                                title='Hapus Lampiran'>
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <label
                                className={`cursor-pointer px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center shrink-0 min-w-[85px] text-center select-none ${
                                  isUploadingThis ? "opacity-50 cursor-not-allowed" : ""
                                }`}>
                                {isUploadingThis ? "Proses..." : "Upload"}
                                <input
                                  type='file'
                                  accept='image/jpeg,image/png,image/webp,application/pdf'
                                  className='hidden'
                                  onChange={(e) =>
                                    handleSpecificFileUpload(e, docType)
                                  }
                                  disabled={isUploadingThis || uploadingType !== null}
                                />
                              </label>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* STICKY FOOTER ACTIONS */}
              <div className='sticky bottom-0 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-8 py-5 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-end gap-3 shrink-0 select-none'>
                <button
                  type='button'
                  className='btn btn-secondary px-5 py-2 text-xs font-bold rounded-xl'
                  onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button
                  type='submit'
                  className='btn btn-primary px-6 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm'
                  disabled={isSubmitting || uploadingType !== null}>
                  {isSubmitting ? (
                    <>
                      <div className='w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Pembayaran</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedPayment && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-md transition-opacity'
          onClick={() => setIsDetailModalOpen(false)}>
          <div
            className='bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800'
            onClick={(e) => e.stopPropagation()}>
            {/* Detail Header - Monochrome */}
            <div className='bg-zinc-950 dark:bg-zinc-950 border-b border-zinc-800 p-8 text-white relative overflow-hidden'>
              <div className='absolute top-0 right-0 p-8 opacity-5 transform translate-x-4 -translate-y-4 select-none'>
                <Receipt size={120} />
              </div>
              <div className='relative z-10'>
                <div className='flex justify-between items-start mb-4'>
                  <span className='bg-zinc-800/80 border border-zinc-700/60 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5'>
                    <CheckCircle2 size={14} className='text-white' /> Diterima
                  </span>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className='text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 p-1.5 rounded-xl transition-all'>
                    <X size={20} />
                  </button>
                </div>
                <p className='text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1'>
                  Total Nominal Masuk
                </p>
                <h2 className='text-4xl font-extrabold tracking-tight mb-2'>
                  {formatRupiah(selectedPayment.amount)}
                </h2>
                <p className='text-zinc-500 text-xs font-semibold'>
                  No Ref: {selectedPayment.number}
                </p>
              </div>
            </div>

            <div className='p-8'>
              <h3 className='text-xs font-extrabold text-zinc-950 dark:text-zinc-100 uppercase tracking-widest mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2'>
                Informasi Transaksi
              </h3>

              <div className='grid grid-cols-2 gap-y-6 gap-x-4 text-sm mb-8'>
                <div>
                  <p className='text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1'>
                    Tanggal Transaksi
                  </p>
                  <p className='font-bold text-zinc-900 dark:text-white text-base'>
                    {formatDate(selectedPayment.paymentDate)}
                  </p>
                </div>
                <div>
                  <p className='text-zinc-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1'>
                    Metode
                  </p>
                  <p className='font-bold text-zinc-900 dark:text-white text-base'>
                    {selectedPayment.method}
                  </p>
                </div>
                <div>
                  <p className='text-zinc-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1'>
                    Pelanggan
                  </p>
                  <p className='font-bold text-zinc-900 dark:text-white text-base'>
                    {selectedPayment.invoice?.customer?.name}
                  </p>
                </div>
                <div>
                  <p className='text-zinc-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1'>
                    Untuk Invoice
                  </p>
                  <p className='font-bold text-zinc-950 dark:text-white hover:underline cursor-pointer text-base'>
                    {selectedPayment.invoice?.number}
                  </p>
                </div>
                <div>
                  <p className='text-zinc-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1'>
                    Referensi SO
                  </p>
                  <p className='font-bold text-zinc-950 dark:text-white hover:underline cursor-pointer text-base'>
                    {selectedPayment.invoice?.salesOrder?.number || "-"}
                  </p>
                </div>
                <div className='col-span-2 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800'>
                  <p className='text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1'>
                    Catatan Referensi
                  </p>
                  <p className='font-semibold text-zinc-800 dark:text-zinc-200'>
                    {selectedPayment.notes || "Tidak ada catatan"}
                  </p>
                </div>
              </div>

              {/* ATTACHMENTS */}
              <h3 className='text-xs font-extrabold text-zinc-950 dark:text-zinc-100 uppercase tracking-widest mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2'>
                Berkas Pelengkap
              </h3>

              {paymentAttachments.length > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {paymentAttachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.fileUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='group flex items-center gap-3 p-3 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-850 transition-all shadow-sm hover:shadow-md'>
                      <div className='w-10 h-10 bg-zinc-100 group-hover:bg-zinc-200 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-200 rounded-lg flex items-center justify-center shrink-0 transition-colors'>
                        <ImageIcon size={20} />
                      </div>
                      <div className='overflow-hidden flex-1'>
                        <p className='text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-zinc-950 dark:group-hover:text-white'>
                          {att.docType}
                        </p>
                        <p className='text-xs text-zinc-500 truncate mt-0.5 flex items-center gap-1 font-semibold'>
                          Lihat dokumen <ExternalLink size={10} />
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className='text-center py-6 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800'>
                  <p className='text-xs font-semibold text-zinc-500 italic'>
                    Tidak ada berkas yang dilampirkan untuk transaksi ini.
                  </p>
                </div>
              )}
            </div>

            <div className='p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-end'>
              <button
                className='px-6 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl transition-all shadow-sm font-bold text-sm'
                onClick={() => setIsDetailModalOpen(false)}>
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

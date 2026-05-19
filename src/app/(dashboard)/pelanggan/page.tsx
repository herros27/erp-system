"use client";

import { useState, useEffect } from "react";
import { useCompanyStore } from "@/stores/company-store";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function PelangganPage() {
  const { activeCompany } = useCompanyStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Views
  const [relationFilter, setRelationFilter] = useState<string>("all"); // 'all' | 'parent' | 'child'
  const [viewMode, setViewMode] = useState<"list" | "group">("list"); // 'list' | 'group'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    parentId: "",
  });

  // Debouncing search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (activeCompany) {
      fetchCustomers();
      fetchAllCustomers();
    }
  }, [activeCompany, search, page, relationFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/customers", window.location.origin);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", "10");
      if (search) url.searchParams.set("search", search);
      if (relationFilter !== "all") {
        url.searchParams.set("relation", relationFilter);
      }

      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: { "x-company-id": activeCompany?.id || "" },
      });
      const json = await res.json();

      if (json.success) {
        setCustomers(json.data);
        setTotalPages(json.meta?.totalPages || 1);
      } else {
        toast.error(json.message || "Gagal memuat pelanggan");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const res = await fetch("/api/customers?all=true", {
        cache: "no-store",
        headers: { "x-company-id": activeCompany?.id || "" },
      });
      const json = await res.json();
      if (json.success) {
        setAllCustomers(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat semua pelanggan", err);
    }
  };

  const handleOpenModal = (customer?: any, defaultParentId?: string) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        code: customer.code || "",
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        taxId: customer.taxId || "",
        parentId: customer.parentId || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        code: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        parentId: defaultParentId || "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const method = editingId ? "PUT" : "POST";

      const payload = {
        ...formData,
        parentId: formData.parentId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setIsModalOpen(false);
        fetchCustomers();
        fetchAllCustomers();
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pelanggan "${name}"?`))
      return;

    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        fetchCustomers();
        fetchAllCustomers();
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("Gagal menghapus pelanggan");
    }
  };

  // Grouping algorithm for holding company view
  const getGroups = () => {
    // 1. Filter customers by search from full data
    let list = [...allCustomers];
    if (search) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
          (c.parent &&
            c.parent.name.toLowerCase().includes(search.toLowerCase())),
      );
    }

    // 2. Filter by relationship type
    if (relationFilter === "parent") {
      list = list.filter((c) => !c.parentId);
    } else if (relationFilter === "child") {
      list = list.filter((c) => !!c.parentId);
    }

    // 3. Group by parent
    const groups: { [key: string]: { parent: any; children: any[] } } = {};
    const standalone: any[] = [];

    // First, find all parent companies that exist in this filtered list
    list.forEach((c) => {
      if (!c.parentId) {
        const hasChildren = allCustomers.some(
          (child) => child.parentId === c.id,
        );
        if (hasChildren) {
          groups[c.id] = { parent: c, children: [] };
        } else {
          standalone.push(c);
        }
      }
    });

    // Place children in their respective groups
    list.forEach((c) => {
      if (c.parentId) {
        if (groups[c.parentId]) {
          groups[c.parentId].children.push(c);
        } else {
          const parentObj =
            allCustomers.find((p) => p.id === c.parentId) || c.parent;
          if (parentObj) {
            if (!groups[c.parentId]) {
              groups[c.parentId] = { parent: parentObj, children: [] };
            }
            groups[c.parentId].children.push(c);
          } else {
            standalone.push(c);
          }
        }
      }
    });

    return {
      groups: Object.values(groups),
      standalone,
    };
  };

  const { groups, standalone } = getGroups();

  return (
    <div className='space-y-8 animate-in fade-in duration-300'>
      {/* HEADER SECTION */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3'>
            <Users
              size={28}
              className='text-zinc-900 dark:text-zinc-100 shrink-0'
            />
            Pelanggan
          </h1>
          <p className='text-sm mt-1 text-zinc-500 dark:text-zinc-400 font-medium'>
            Kelola data pelanggan (customer) perusahaan Anda
          </p>
        </div>
        <button
          className='px-5 py-3 bg-zinc-950 hover:bg-zinc-900 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2'
          onClick={() => handleOpenModal()}>
          <Plus size={18} />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* FILTERS & SEARCH ROW */}
      <div className='flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-850 shadow-sm'>
        {/* Search */}
        <div className='flex items-center gap-3 px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus-within:ring-2 focus-within:ring-zinc-950 focus-within:border-zinc-950 dark:focus-within:ring-zinc-200 transition-all w-full md:max-w-md'>
          <Search className='w-5 h-5 text-zinc-400 shrink-0' />
          <input
            type='text'
            placeholder='Cari kode atau nama pelanggan...'
            className='w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 text-zinc-900 dark:text-white'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Controls */}
        <div className='flex flex-wrap items-center gap-3 w-full md:w-auto justify-end'>
          {/* Relation Filter Dropdown */}
          <select
            value={relationFilter}
            onChange={(e) => {
              setRelationFilter(e.target.value);
              setPage(1);
            }}
            className='px-4 py-3 bg-zinc-50 hover:bg-zinc-100/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer'>
            <option value='all'>Semua Hubungan</option>
            <option value='parent'>Hanya Induk / Mandiri</option>
            <option value='child'>Hanya Anak Perusahaan</option>
          </select>

          {/* View Toggle */}
          <div className='flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200/85 dark:border-zinc-800 shadow-inner flex-nowrap shrink-0'>
            <button
              type='button'
              onClick={() => setViewMode("list")}
              className={`px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                viewMode === "list"
                  ? "bg-white text-zinc-950 dark:bg-zinc-850 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-105"
              }`}>
              Tampilan List
            </button>
            <button
              type='button'
              onClick={() => setViewMode("group")}
              className={`px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                viewMode === "group"
                  ? "bg-white text-zinc-950 dark:bg-zinc-850 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-105"
              }`}>
              Group Perusahaan
            </button>
          </div>
        </div>
      </div>

      {/* DATA VIEW CONTAINER */}
      {viewMode === "list" ? (
        /* STANDARD LIST VIEW (PAGINATED) */
        <div className='card p-0 overflow-hidden border border-zinc-100 dark:border-zinc-850 shadow-sm rounded-2xl bg-white dark:bg-zinc-900'>
          <div className='overflow-x-auto'>
            {loading ? (
              <div className='flex flex-col items-center justify-center py-20 text-zinc-500'>
                <div className='w-8 h-8 border-2 border-zinc-950 dark:border-white border-t-transparent rounded-full animate-spin mb-4'></div>
                <p className='text-sm font-medium'>Memuat data pelanggan...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className='py-20 flex flex-col items-center text-center px-4'>
                <div className='w-20 h-20 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mb-4 border border-dashed border-zinc-200 dark:border-zinc-800'>
                  <Users size={32} className='text-zinc-400' />
                </div>
                <h3 className='text-lg font-bold text-zinc-900 dark:text-white mb-1'>
                  Belum ada pelanggan
                </h3>
                <p className='text-sm text-zinc-500 max-w-sm'>
                  Tidak ada data pelanggan yang cocok dengan kriteria
                  pencarian/filter.
                </p>
              </div>
            ) : (
              <table className='w-full text-sm text-left'>
                <thead className='text-xs text-zinc-500 uppercase bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-850'>
                  <tr>
                    <th className='px-6 py-4 font-bold w-32'>Kode</th>
                    <th className='px-6 py-4 font-bold'>Nama Pelanggan</th>
                    <th className='px-6 py-4 font-bold'>Telepon</th>
                    <th className='px-6 py-4 font-bold'>Email</th>
                    <th className='px-6 py-4 font-bold'>NPWP / Tax ID</th>
                    <th className='px-6 py-4 font-bold text-center w-36'>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-zinc-100 dark:divide-zinc-850'>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className='hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors'>
                      <td className='px-6 py-4'>
                        <span className='px-2.5 py-1 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-lg font-bold text-xs shadow-sm'>
                          {customer.code}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='font-bold text-zinc-950 dark:text-white'>
                          {customer.name}
                        </div>
                        {customer.parent && (
                          <div className='text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 font-semibold'>
                            <Users
                              size={12}
                              className='inline text-zinc-400 shrink-0'
                            />
                            <span>
                              Cabang dari:{" "}
                              <strong className='text-zinc-800 dark:text-zinc-200 font-bold'>
                                {customer.parent.name}
                              </strong>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className='px-6 py-4 text-zinc-600 dark:text-zinc-400 font-semibold'>
                        {customer.phone || "-"}
                      </td>
                      <td className='px-6 py-4 text-zinc-500 dark:text-zinc-400 font-semibold'>
                        {customer.email || "-"}
                      </td>
                      <td className='px-6 py-4 text-zinc-500 dark:text-zinc-400 font-semibold'>
                        {customer.taxId || "-"}
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex items-center justify-center gap-2'>
                          {!customer.parentId && (
                            <button
                              className='p-2.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'
                              onClick={() =>
                                handleOpenModal(undefined, customer.id)
                              }
                              title='Tambah Anak Perusahaan'>
                              <Plus size={18} />
                            </button>
                          )}
                          <button
                            className='p-2.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'
                            onClick={() => handleOpenModal(customer)}
                            title='Edit'>
                            <Edit size={18} />
                          </button>
                          <button
                            className='p-2.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'
                            onClick={() =>
                              handleDelete(customer.id, customer.name)
                            }
                            title='Hapus'>
                            <Trash2 size={18} />
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
          {!loading && totalPages > 1 && (
            <div className='p-5 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col sm:flex-row items-center justify-between gap-4'>
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
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
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
      ) : (
        /* HOLDING & GROUPED CUSTOMER VIEW */
        <div className='space-y-6'>
          {groups.length === 0 && standalone.length === 0 ? (
            <div className='card py-20 flex flex-col items-center justify-center text-center px-4 border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm'>
              <div className='w-20 h-20 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mb-4 border border-dashed border-zinc-200 dark:border-zinc-800'>
                <Users size={32} className='text-zinc-400' />
              </div>
              <h3 className='text-lg font-bold text-zinc-900 dark:text-white mb-1'>
                Grup Tidak Ditemukan
              </h3>
              <p className='text-sm text-zinc-500 max-w-sm'>
                Tidak ada data kelompok holding atau group perusahaan yang cocok
                dengan filter.
              </p>
            </div>
          ) : (
            <>
              {/* Group Cards */}
              {groups.map((group: any) => (
                <div
                  key={group.parent.id}
                  className='border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all'>
                  {/* Group Header (Parent Company details) */}
                  <div className='bg-zinc-50 dark:bg-zinc-950/65 px-6 py-5 border-b border-zinc-250 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
                    <div>
                      <span className='px-2 py-0.5 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-md text-[10px] font-extrabold uppercase tracking-wider mb-1.5 inline-block shadow-sm'>
                        Holding / Induk Group
                      </span>
                      <h3 className='text-base font-extrabold text-zinc-950 dark:text-white'>
                        {group.parent.name}{" "}
                        <span className='text-zinc-400 dark:text-zinc-500 font-bold ml-1'>
                          ({group.parent.code})
                        </span>
                      </h3>
                      <p className='text-xs font-semibold text-zinc-500 mt-1'>
                        {group.parent.address || "Alamat belum diatur"} | Tax
                        ID: {group.parent.taxId || "-"} | Email:{" "}
                        {group.parent.email || "-"}
                      </p>
                    </div>
                    <div className='flex items-center gap-2.5'>
                      <button
                        onClick={() =>
                          handleOpenModal(undefined, group.parent.id)
                        }
                        className='px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800'
                        title='Tambah Anak Perusahaan'>
                        <Plus size={16} /> Anak Cabang
                      </button>
                      <button
                        onClick={() => handleOpenModal(group.parent)}
                        className='p-2.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-450 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'>
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(group.parent.id, group.parent.name)
                        }
                        className='p-2.5 text-zinc-550 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-450 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all'>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Group Children list */}
                  <div className='px-6 py-4 bg-white dark:bg-zinc-900'>
                    <p className='text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mt-1 mb-2 px-2'>
                      Anggota Anak Perusahaan / Cabang ({group.children.length})
                    </p>
                    {group.children.length === 0 ? (
                      <p className='text-xs text-zinc-400 dark:text-zinc-500 italic py-3 px-2'>
                        Tidak ada anak perusahaan terdaftar.
                      </p>
                    ) : (
                      <div className='overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-850'>
                        <table className='w-full text-xs text-left'>
                          <thead>
                            <tr className='border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-zinc-400 font-bold uppercase tracking-wider text-[10px]'>
                              <th className='py-3.5 px-3'>Kode</th>
                              <th className='py-3.5 px-3'>Nama Cabang</th>
                              <th className='py-3.5 px-3'>Telepon</th>
                              <th className='py-3.5 px-3'>Email</th>
                              <th className='py-3.5 px-3'>Tax ID</th>
                              <th className='py-3.5 px-3 text-center w-28'>
                                Aksi
                              </th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-zinc-50 dark:divide-zinc-850'>
                            {group.children.map((child: any) => (
                              <tr
                                key={child.id}
                                className='hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors'>
                                <td className='py-3.5 px-3 font-bold text-zinc-800 dark:text-zinc-200'>
                                  {child.code}
                                </td>
                                <td className='py-3.5 px-3 font-bold text-zinc-950 dark:text-white'>
                                  {child.name}
                                </td>
                                <td className='py-3.5 px-3 font-semibold text-zinc-500'>
                                  {child.phone || "-"}
                                </td>
                                <td className='py-3.5 px-3 font-semibold text-zinc-500'>
                                  {child.email || "-"}
                                </td>
                                <td className='py-3.5 px-3 font-semibold text-zinc-500'>
                                  {child.taxId || "-"}
                                </td>
                                <td className='py-3.5 px-3'>
                                  <div className='flex justify-end gap-2'>
                                    <button
                                      onClick={() => handleOpenModal(child)}
                                      className='p-2.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all'>
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDelete(child.id, child.name)
                                      }
                                      className='p-2.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all'>
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Standalone Group Card */}
              {standalone.length > 0 && (
                <div className='border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all'>
                  <div className='bg-zinc-50 dark:bg-zinc-950/65 px-6 py-4 border-b border-zinc-250 dark:border-zinc-800'>
                    <span className='px-2 py-0.5 bg-zinc-500 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wider mb-1.5 inline-block shadow-sm'>
                      Independen / Mandiri
                    </span>
                    <h3 className='text-base font-extrabold text-zinc-950 dark:text-white'>
                      Pelanggan Mandiri
                    </h3>
                    <p className='text-xs text-zinc-500 mt-1 font-semibold'>
                      Daftar pelanggan independen yang berdiri sendiri tanpa
                      relasi holding atau afliasi group perusahaan.
                    </p>
                  </div>
                  <div className='p-6'>
                    <div className='overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-850'>
                      <table className='w-full text-xs text-left'>
                        <thead>
                          <tr className='border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-zinc-400 font-bold uppercase tracking-wider text-[10px]'>
                            <th className='py-3.5 px-3'>Kode</th>
                            <th className='py-3.5 px-3'>Nama Pelanggan</th>
                            <th className='py-3.5 px-3'>Telepon</th>
                            <th className='py-3.5 px-3'>Email</th>
                            <th className='py-3.5 px-3'>Tax ID</th>
                            <th className='py-3.5 px-3 text-center w-36'>
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-zinc-50 dark:divide-zinc-850'>
                          {standalone.map((child: any) => (
                            <tr
                              key={child.id}
                              className='hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors'>
                              <td className='py-3.5 px-3 font-bold text-zinc-800 dark:text-zinc-200'>
                                {child.code}
                              </td>
                              <td className='py-3.5 px-3 font-bold text-zinc-950 dark:text-white'>
                                {child.name}
                              </td>
                              <td className='py-3.5 px-3 font-semibold text-zinc-500'>
                                {child.phone || "-"}
                              </td>
                              <td className='py-3.5 px-3 font-semibold text-zinc-500'>
                                {child.email || "-"}
                              </td>
                              <td className='py-3.5 px-3 font-semibold text-zinc-500'>
                                {child.taxId || "-"}
                              </td>
                              <td className='py-3.5 px-3'>
                                <div className='flex items-center justify-center gap-2'>
                                  <button
                                    onClick={() =>
                                      handleOpenModal(undefined, child.id)
                                    }
                                    className='p-2.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-450 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all'
                                    title='Jadikan Induk & Tambah Anak Cabang'>
                                    <Plus size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenModal(child)}
                                    className='p-2.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-450 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all'>
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDelete(child.id, child.name)
                                    }
                                    className='p-2.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-450 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all'>
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-md transition-opacity'
          onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div
            className='bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-zinc-100 dark:border-zinc-800'
            onClick={(e) => e.stopPropagation()}>
            {/* MODAL HEADER */}
            <div className='bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80 px-8 py-6 flex items-center justify-between shrink-0'>
              <h2 className='text-xl font-extrabold text-zinc-950 dark:text-white flex items-center gap-3'>
                {editingId ? (
                  <Edit
                    size={20}
                    className='text-zinc-900 dark:text-zinc-100'
                  />
                ) : (
                  <Plus
                    size={20}
                    className='text-zinc-900 dark:text-zinc-100'
                  />
                )}
                {editingId ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h2>
              <button
                type='button'
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className='p-3 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 rounded-xl transition-colors'>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className='flex-1 overflow-y-auto flex flex-col p-8'>
              <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200'>
                      Kode Pelanggan <span className='text-zinc-400'>*</span>
                    </label>
                    <input
                      type='text'
                      className='w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-bold uppercase'
                      required
                      placeholder='Contoh: CUST-001'
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      disabled={!!editingId} // Tidak bisa edit kode
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200'>
                      Nama Pelanggan <span className='text-zinc-400'>*</span>
                    </label>
                    <input
                      type='text'
                      className='w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-bold'
                      required
                      placeholder='Nama lengkap perusahaan/individu'
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200'>
                      Email
                    </label>
                    <input
                      type='email'
                      className='w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-semibold'
                      placeholder='email@perusahaan.com'
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200'>
                      Telepon / WhatsApp
                    </label>
                    <input
                      type='text'
                      className='w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-semibold'
                      placeholder='08123456789'
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200'>
                    Alamat Lengkap
                  </label>
                  <textarea
                    className='w-full px-5 py-2 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-medium min-h-20 resize-none'
                    placeholder='Alamat kantor atau domisili pelanggan'
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200'>
                      NPWP / Tax ID
                    </label>
                    <input
                      type='text'
                      className='w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-semibold'
                      placeholder='Nomor NPWP'
                      value={formData.taxId}
                      onChange={(e) =>
                        setFormData({ ...formData, taxId: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200'>
                      Perusahaan Induk (Optional)
                    </label>
                    <select
                      className='w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-850 dark:text-zinc-100 font-bold cursor-pointer'
                      value={formData.parentId}
                      onChange={(e) =>
                        setFormData({ ...formData, parentId: e.target.value })
                      }>
                      <option value=''>
                        -- Tanpa Perusahaan Induk (Sebagai Induk) --
                      </option>
                      {allCustomers
                        .filter((c) => c.id !== editingId) // Prevent self-parenting
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-3 pt-6 mt-8 border-t border-zinc-100 dark:border-zinc-800/80'>
                <button
                  type='button'
                  className='px-5 py-2.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:text-zinc-950 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-all shadow-sm'
                  onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button
                  type='submit'
                  className='px-6 py-2.5 text-xs font-semibold text-white bg-zinc-950 border border-transparent rounded-xl hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-50'
                  disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

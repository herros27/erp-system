'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatDate } from '@/lib/utils'

export default function InvoicePrintPage() {
  const params = useParams()
  const { activeCompany } = useCompanyStore()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany) return

    const fetchInvoice = async () => {
      try {
        // Karena ini halaman terpisah, kita fetch daftar invoice dan cari yang sesuai
        // (Atau bisa buat endpoint GET /api/invoices/[id] jika ada, tapi kita gunakan daftar saja agar aman)
        const res = await fetch('/api/invoices', {
          headers: { 'x-company-id': activeCompany.id }
        })
        const json = await res.json()
        
        if (json.success) {
          const found = json.data.find((inv: any) => inv.id === params.id)
          if (found) {
            setInvoice(found)
          }
        }
      } catch (err) {
        console.error('Failed to fetch invoice:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [activeCompany, params.id])

  useEffect(() => {
    if (invoice && !loading) {
      // Tunggu render selesai baru panggil print
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [invoice, loading])

  if (loading) {
    return <div className="p-10 text-center font-sans">Menyiapkan dokumen faktur...</div>
  }

  if (!invoice) {
    return <div className="p-10 text-center font-sans text-red-500">Invoice tidak ditemukan.</div>
  }

  return (
    <div className="font-sans text-gray-800 bg-white min-h-screen p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Header Invoice */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wider mb-2">INVOICE</h1>
          <p className="text-sm text-gray-500 font-medium">{invoice.number}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{activeCompany?.name}</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{activeCompany?.address || 'Alamat Perusahaan Belum Diatur'}</p>
          <p className="text-sm text-gray-500 mt-1">{activeCompany?.email}</p>
          <p className="text-sm text-gray-500">{activeCompany?.phone}</p>
        </div>
      </div>

      {/* Info Tagihan */}
      <div className="flex justify-between mb-10">
        <div className="w-1/2">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Ditagihkan Kepada:</p>
          <h3 className="text-lg font-bold text-gray-800">{invoice.customer?.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{invoice.customer?.address || '-'}</p>
          <p className="text-sm text-gray-600 mt-1">{invoice.customer?.phone || '-'}</p>
          <p className="text-sm text-gray-600">{invoice.customer?.email || '-'}</p>
        </div>
        <div className="w-1/3 space-y-3">
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">Tanggal Invoice:</span>
            <span className="text-sm font-semibold text-gray-800">{formatDate(invoice.invoiceDate)}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">Jatuh Tempo:</span>
            <span className="text-sm font-semibold text-gray-800">{formatDate(invoice.dueDate)}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">Status:</span>
            <span className="text-sm font-bold uppercase" style={{
              color: invoice.status === 'PAID' ? '#16a34a' : 
                     invoice.status === 'OVERDUE' ? '#dc2626' : 
                     invoice.status === 'PARTIAL' ? '#0284c7' : '#ea580c'
            }}>
              {invoice.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Item */}
      <table className="w-full mb-8 text-sm">
        <thead className="bg-gray-100 border-y-2 border-gray-300">
          <tr>
            <th className="py-3 px-4 text-left font-semibold text-gray-700">No</th>
            <th className="py-3 px-4 text-left font-semibold text-gray-700">Produk / Layanan</th>
            <th className="py-3 px-4 text-center font-semibold text-gray-700">Kuantitas</th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700">Harga Satuan</th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item: any, idx: number) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-3 px-4 text-gray-600">{idx + 1}</td>
              <td className="py-3 px-4 font-medium text-gray-800">{item.product?.name}</td>
              <td className="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
              <td className="py-3 px-4 text-right text-gray-600">{formatRupiah(item.unitPrice)}</td>
              <td className="py-3 px-4 text-right font-medium text-gray-800">{formatRupiah(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Kalkulasi Total */}
      <div className="flex justify-end mb-12">
        <div className="w-1/2 md:w-1/3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium text-gray-600">Subtotal:</span>
            <span className="text-sm font-semibold text-gray-800">{formatRupiah(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium text-gray-600">PPN (11%):</span>
            <span className="text-sm font-semibold text-gray-800">{formatRupiah(invoice.tax)}</span>
          </div>
          <div className="flex justify-between py-3 border-b-2 border-gray-800 mt-1 bg-gray-50 px-2 rounded">
            <span className="text-base font-bold text-gray-900">Total Tagihan:</span>
            <span className="text-base font-bold text-blue-700">{formatRupiah(invoice.total)}</span>
          </div>
          
          {invoice.paidAmount > 0 && (
            <div className="flex justify-between py-2 mt-2">
              <span className="text-sm font-medium text-gray-500">Telah Dibayar:</span>
              <span className="text-sm font-semibold text-green-600">{formatRupiah(invoice.paidAmount)}</span>
            </div>
          )}
          {invoice.paidAmount > 0 && (
            <div className="flex justify-between py-2 border-t">
              <span className="text-sm font-bold text-gray-800">Sisa Tagihan:</span>
              <span className="text-sm font-bold text-red-600">{formatRupiah(invoice.total - invoice.paidAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Notes */}
      {invoice.notes && (
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Catatan / Instruksi Pembayaran:</p>
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
            {invoice.notes}
          </div>
        </div>
      )}

      <div className="text-center mt-20 pt-8 border-t text-sm text-gray-400">
        <p>Terima kasih atas kerja sama Anda dengan {activeCompany?.name}.</p>
        <p>Invoice ini dibuat secara elektronik dan sah tanpa tanda tangan fisik.</p>
      </div>
      
      {/* CSS Khusus Print (Sembunyikan elemen non-kertas) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1cm; size: A4 portrait; }
        }
      `}} />
    </div>
  )
}

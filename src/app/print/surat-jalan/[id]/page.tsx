'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useCompanyStore } from '@/stores/company-store'
import { formatDate } from '@/lib/utils'

export default function SuratJalanPrintPage() {
  const params = useParams()
  const { activeCompany } = useCompanyStore()
  const [sj, setSj] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany) return

    const fetchSJ = async () => {
      try {
        const res = await fetch('/api/surat-jalan', {
          headers: { 'x-company-id': activeCompany.id }
        })
        const json = await res.json()
        
        if (json.success) {
          const found = json.data.find((item: any) => item.id === params.id)
          if (found) {
            setSj(found)
          }
        }
      } catch (err) {
        console.error('Failed to fetch surat jalan:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSJ()
  }, [activeCompany, params.id])

  useEffect(() => {
    if (sj && !loading) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [sj, loading])

  if (loading) {
    return <div className="p-10 text-center font-sans">Menyiapkan dokumen Surat Jalan...</div>
  }

  if (!sj) {
    return <div className="p-10 text-center font-sans text-red-500">Surat Jalan tidak ditemukan.</div>
  }

  const order = sj.salesOrder || {}
  const deliveredItems = sj.items || []

  return (
    <div className="font-sans text-gray-800 bg-white min-h-screen p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Header Surat Jalan */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wider mb-2">SURAT JALAN</h1>
          <p className="text-sm text-gray-500 font-medium">No. SJ: {sj.number}</p>
          <p className="text-xs text-gray-400">Ref. SO: {order.number}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{activeCompany?.name}</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{activeCompany?.address || 'Alamat Perusahaan Belum Diatur'}</p>
          <p className="text-sm text-gray-500 mt-1">{activeCompany?.email}</p>
          <p className="text-sm text-gray-500">{activeCompany?.phone}</p>
        </div>
      </div>

      {/* Info Pengiriman */}
      <div className="flex justify-between mb-10">
        <div className="w-1/2">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Dikirim Kepada / Tujuan:</p>
          <h3 className="text-lg font-bold text-gray-800">{order.customer?.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{order.customer?.address || '-'}</p>
          <p className="text-sm text-gray-600 mt-1">{order.customer?.phone || '-'}</p>
          <p className="text-sm text-gray-600">{order.customer?.email || '-'}</p>
        </div>
        <div className="w-1/3 space-y-3">
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">Tanggal Pengiriman:</span>
            <span className="text-sm font-semibold text-gray-800">{formatDate(sj.deliveryDate)}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">No. Polisi Kendaraan:</span>
            <span className="text-sm font-semibold text-gray-800">{sj.licensePlate || '________________'}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">Nama Supir:</span>
            <span className="text-sm font-semibold text-gray-800">{sj.driverName || '________________'}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 text-sm rounded">
        <strong>PENTING:</strong> Surat Jalan ini berlaku sebagai bukti serah terima barang fisik. Harap periksa kondisi dan jumlah barang sebelum menandatangani dokumen ini.
      </div>

      {/* Tabel Item (TANPA HARGA) */}
      <table className="w-full mb-8 text-sm">
        <thead className="bg-gray-100 border-y-2 border-gray-300">
          <tr>
            <th className="py-3 px-4 text-center font-semibold text-gray-700 w-16">No</th>
            <th className="py-3 px-4 text-center font-semibold text-gray-700 w-24">Kode</th>
            <th className="py-3 px-4 text-left font-semibold text-gray-700">Nama Barang / Spesifikasi</th>
            <th className="py-3 px-4 text-center font-semibold text-gray-700 w-32">Kuantitas Dikirim</th>
          </tr>
        </thead>
        <tbody>
          {deliveredItems.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-500">Tidak ada barang fisik yang dikirim pada pengiriman ini (Indent/Pending).</td>
            </tr>
          ) : (
            deliveredItems.map((item: any, idx: number) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-3 px-4 text-center text-gray-600">{idx + 1}</td>
                <td className="py-3 px-4 text-center text-gray-600 font-mono text-xs">{item.product?.code || '-'}</td>
                <td className="py-3 px-4 font-medium text-gray-800">{item.product?.name}</td>
                <td className="py-3 px-4 text-center font-bold text-gray-800 text-base">{item.quantity}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Footer / Notes */}
      {sj.notes && (
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Instruksi Pengiriman / Catatan:</p>
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
            {sj.notes}
          </div>
        </div>
      )}

      {/* Kolom Tanda Tangan */}
      <div className="mt-16 grid grid-cols-3 gap-8">
        <div className="text-center flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-600 mb-20">Penerima (Pelanggan)</p>
          <div className="w-full border-b border-gray-400"></div>
          <p className="text-xs text-gray-500 mt-2">Nama Terang & Tanda Tangan</p>
        </div>
        <div className="text-center flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-600 mb-20">Pengemudi / Kurir</p>
          <div className="w-full border-b border-gray-400"></div>
          <p className="text-xs text-gray-500 mt-2">Nama Terang & Tanda Tangan</p>
        </div>
        <div className="text-center flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-600 mb-20">Pengirim (Gudang)</p>
          <div className="w-full border-b border-gray-400"></div>
          <p className="text-xs text-gray-500 mt-2">Nama Terang & Tanda Tangan</p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1cm; size: A4 portrait; }
        }
      `}} />
    </div>
  )
}

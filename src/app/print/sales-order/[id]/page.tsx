'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatDate } from '@/lib/utils'

export default function SalesOrderPrintPage() {
  const params = useParams()
  const { activeCompany } = useCompanyStore()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany) return

    const fetchOrder = async () => {
      try {
        const res = await fetch('/api/sales/orders', {
          headers: { 'x-company-id': activeCompany.id }
        })
        const json = await res.json()
        
        if (json.success) {
          const found = json.data.find((so: any) => so.id === params.id)
          if (found) {
            setOrder(found)
          }
        }
      } catch (err) {
        console.error('Failed to fetch sales order:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [activeCompany, params.id])

  useEffect(() => {
    if (order && !loading) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [order, loading])

  if (loading) {
    return <div className="p-10 text-center font-sans">Menyiapkan dokumen Sales Order...</div>
  }

  if (!order) {
    return <div className="p-10 text-center font-sans text-red-500">Sales Order tidak ditemukan.</div>
  }

  return (
    <div className="font-sans text-gray-800 bg-white min-h-screen p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Header SO */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wider mb-2">SALES ORDER</h1>
          <p className="text-sm text-gray-500 font-medium">{order.number}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{activeCompany?.name}</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{activeCompany?.address || 'Alamat Perusahaan Belum Diatur'}</p>
          <p className="text-sm text-gray-500 mt-1">{activeCompany?.email}</p>
          <p className="text-sm text-gray-500">{activeCompany?.phone}</p>
        </div>
      </div>

      {/* Info Pesanan */}
      <div className="flex justify-between mb-10">
        <div className="w-1/2">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Pemesan:</p>
          <h3 className="text-lg font-bold text-gray-800">{order.customer?.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{order.customer?.address || '-'}</p>
          <p className="text-sm text-gray-600 mt-1">{order.customer?.phone || '-'}</p>
          <p className="text-sm text-gray-600">{order.customer?.email || '-'}</p>
        </div>
        <div className="w-1/3 space-y-3">
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">Tanggal Order:</span>
            <span className="text-sm font-semibold text-gray-800">{formatDate(order.orderDate)}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-sm text-gray-500 font-medium">Status SO:</span>
            <span className="text-sm font-bold uppercase" style={{
              color: order.status === 'CONFIRMED' || order.status === 'COMPLETED' ? '#16a34a' : 
                     order.status === 'INDENT' ? '#ea580c' : 
                     order.status === 'CANCELLED' ? '#dc2626' : '#475569'
            }}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Item */}
      <table className="w-full mb-8 text-sm">
        <thead className="bg-gray-100 border-y-2 border-gray-300">
          <tr>
            <th className="py-3 px-4 text-left font-semibold text-gray-700">No</th>
            <th className="py-3 px-4 text-left font-semibold text-gray-700">Produk</th>
            <th className="py-3 px-4 text-center font-semibold text-gray-700">Pesanan</th>
            <th className="py-3 px-4 text-center font-semibold text-green-600">Terpenuhi</th>
            <th className="py-3 px-4 text-center font-semibold text-orange-500">Indent</th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700">Harga Satuan</th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, idx: number) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-3 px-4 text-gray-600">{idx + 1}</td>
              <td className="py-3 px-4 font-medium text-gray-800">{item.product?.name}</td>
              <td className="py-3 px-4 text-center text-gray-800">{item.quantity}</td>
              <td className="py-3 px-4 text-center font-bold text-green-600">{item.fulfilledQty || 0}</td>
              <td className="py-3 px-4 text-center font-bold text-orange-500">{item.indentQty > 0 ? item.indentQty : 0}</td>
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
            <span className="text-sm font-semibold text-gray-800">{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium text-gray-600">PPN (11%):</span>
            <span className="text-sm font-semibold text-gray-800">{formatRupiah(order.tax)}</span>
          </div>
          <div className="flex justify-between py-3 border-b-2 border-gray-800 mt-1 bg-gray-50 px-2 rounded">
            <span className="text-base font-bold text-gray-900">Total Estimasi:</span>
            <span className="text-base font-bold text-blue-700">{formatRupiah(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer / Notes */}
      {order.notes && (
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Catatan Pesanan:</p>
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
            {order.notes}
          </div>
        </div>
      )}

      <div className="text-center mt-20 pt-8 border-t text-sm text-gray-400">
        <p>Terima kasih atas pesanan Anda kepada {activeCompany?.name}.</p>
        <p>Dokumen ini adalah bukti pemesanan yang sah.</p>
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

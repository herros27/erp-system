'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatDate } from '@/lib/utils'

export default function PurchaseOrderPrintPage() {
  const params = useParams()
  const { activeCompany } = useCompanyStore()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany) return
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/purchasing/orders/${params.id}`, {
          headers: { 'x-company-id': activeCompany.id },
        })
        const json = await res.json()
        if (json.success) setOrder(json.data)
        else {
          const listRes = await fetch('/api/purchasing/orders?limit=100', {
            headers: { 'x-company-id': activeCompany.id },
          })
          const listJson = await listRes.json()
          if (listJson.success) {
            const found = listJson.data.find((po: any) => po.id === params.id)
            if (found) setOrder(found)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [activeCompany, params.id])

  useEffect(() => {
    if (order && !loading) setTimeout(() => window.print(), 500)
  }, [order, loading])

  if (loading) return <div className="p-10 text-center font-sans">Menyiapkan dokumen PO...</div>
  if (!order) return <div className="p-10 text-center text-red-500">Purchase Order tidak ditemukan.</div>

  return (
    <div className="font-sans text-gray-800 bg-white min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-wider mb-2">PURCHASE ORDER</h1>
          <p className="text-sm text-gray-500 font-medium">{order.number}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">{activeCompany?.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{activeCompany?.address || 'Alamat belum diatur'}</p>
        </div>
      </div>

      <div className="flex justify-between mb-10">
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Supplier:</p>
          <h3 className="text-lg font-bold">{order.supplier?.name}</h3>
        </div>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Tanggal:</span> {formatDate(order.orderDate)}</p>
          <p><span className="text-gray-500">Status:</span> <strong>{order.status}</strong></p>
        </div>
      </div>

      <table className="w-full mb-8 text-sm">
        <thead className="bg-gray-100 border-y-2">
          <tr>
            <th className="py-3 px-4 text-left">No</th>
            <th className="py-3 px-4 text-left">Produk</th>
            <th className="py-3 px-4 text-center">Qty</th>
            <th className="py-3 px-4 text-center">Diterima</th>
            <th className="py-3 px-4 text-right">Harga</th>
            <th className="py-3 px-4 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, idx: number) => (
            <tr key={item.id} className="border-b">
              <td className="py-3 px-4">{idx + 1}</td>
              <td className="py-3 px-4 font-medium">{item.product?.name}</td>
              <td className="py-3 px-4 text-center">{item.quantity}</td>
              <td className="py-3 px-4 text-center">{item.receivedQty || 0}</td>
              <td className="py-3 px-4 text-right">{formatRupiah(item.unitPrice)}</td>
              <td className="py-3 px-4 text-right">{formatRupiah(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-12">
        <div className="w-1/3 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal:</span><span>{formatRupiah(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>PPN (11%):</span><span>{formatRupiah(order.tax)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>{formatRupiah(order.total)}</span></div>
        </div>
      </div>

      {order.notes && (
        <div className="p-4 bg-gray-50 rounded text-sm border">{order.notes}</div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@media print { @page { margin: 1cm; } }` }} />
    </div>
  )
}

import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const { id } = await params
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is allowed
  }
  const { newNumber } = body

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Ambil data SO sumber beserta item-itemnya
      const so = await tx.salesOrder.findFirst({
        where: { id, companyId },
        include: { items: true }
      })

      if (!so) {
        throw new Error('Sales Order tidak ditemukan')
      }
      if (so.status === 'CANCELLED') {
        throw new Error('Sales Order yang dibatalkan tidak bisa di-split')
      }
      if (so.status === 'COMPLETED') {
        throw new Error('Sales Order yang sudah selesai tidak bisa di-split')
      }

      // 2. Filter item yang memiliki sisa outstanding (belum terkirim sepenuhnya)
      const outstandingItems = so.items.filter(
        (item: any) => item.quantity - item.fulfilledQty > 0
      )

      if (outstandingItems.length === 0) {
        throw new Error('Tidak ada barang outstanding (belum dikirim) yang bisa di-split')
      }

      // 3. Tentukan nomor untuk SO baru (manual atau auto-generate)
      let newSONumber = newNumber
      if (newNumber) {
        const existing = await tx.salesOrder.findFirst({
          where: { number: newNumber, companyId }
        })
        if (existing) {
          throw new Error('Nomor Sales Order baru sudah digunakan')
        }
      } else {
        const count = await tx.salesOrder.count({ where: { companyId } })
        newSONumber = generateNumber('SO', count + 1)
      }

      // 4. Buat item data baru untuk SO Split
      const newSOItemsData = outstandingItems.map((item: any) => {
        const remainingQty = item.quantity - item.fulfilledQty
        return {
          productId: item.productId,
          quantity: remainingQty,
          fulfilledQty: 0,
          indentQty: remainingQty,
          unitPrice: item.unitPrice,
          subtotal: remainingQty * item.unitPrice
        }
      })

      const newSOSubtotal = newSOItemsData.reduce((sum: any, item: any) => sum + item.subtotal, 0)
      const newSOTax = newSOSubtotal * 0.11
      const newSOTotal = newSOSubtotal + newSOTax

      // 5. Simpan SO Baru hasil split
      const newSO = await tx.salesOrder.create({
        data: {
          companyId,
          customerId: so.customerId,
          number: newSONumber,
          orderDate: new Date(), // Tanggal baru saat pemisahan/rollover
          notes: `SO hasil split sisa barang dari SO ${so.number}`,
          subtotal: newSOSubtotal,
          tax: newSOTax,
          total: newSOTotal,
          status: 'CONFIRMED',
          createdBy: userId,
          items: {
            create: newSOItemsData.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              fulfilledQty: item.fulfilledQty,
              indentQty: item.indentQty,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal
            }))
          }
        }
      })

      // 6. Update item pada SO lama (menciutkan kuantitas ke jumlah yang sudah terkirim)
      for (const item of so.items) {
        if (item.fulfilledQty === 0) {
          // Hapus item dari SO lama jika belum pernah dikirim sama sekali
          await tx.salesOrderItem.delete({
            where: { id: item.id }
          })
        } else {
          // Update kuantitas agar pas dengan barang terkirim
          await tx.salesOrderItem.update({
            where: { id: item.id },
            data: {
              quantity: item.fulfilledQty,
              indentQty: 0,
              subtotal: item.fulfilledQty * item.unitPrice
            }
          })
        }
      }

      // 7. Hitung ulang total pada SO lama
      const oldSOItemsUpdated = so.items.filter((item: any) => item.fulfilledQty > 0)
      const oldSOSubtotal = oldSOItemsUpdated.reduce(
        (sum: any, item: any) => sum + item.fulfilledQty * item.unitPrice,
        0
      )
      const oldSOTax = oldSOSubtotal * 0.11
      const oldSOTotal = oldSOSubtotal + oldSOTax

      const updatedOldSO = await tx.salesOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED', // Statusnya selesai karena semua barang sisa sudah dipindahkan
          subtotal: oldSOSubtotal,
          tax: oldSOTax,
          total: oldSOTotal,
          notes: so.notes
            ? `${so.notes}\n[SPLIT] Sisa pesanan dipindahkan ke SO ${newSONumber}`
            : `[SPLIT] Sisa pesanan dipindahkan ke SO ${newSONumber}`
        }
      })

      // 8. Sinkronkan Invoice Lama yang belum lunas (UNPAID)
      const unpaidInvoice = await tx.invoice.findFirst({
        where: { salesOrderId: id, status: 'UNPAID', companyId }
      })

      if (unpaidInvoice) {
        // Hapus detail invoice lama
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: unpaidInvoice.id }
        })

        // Jika ada barang yang sudah dikirim, perbarui rincian dan nilai tagihan invoice lama
        if (oldSOItemsUpdated.length > 0) {
          const oldSOShippedItems = oldSOItemsUpdated.map((item: any) => ({
            productId: item.productId,
            quantity: item.fulfilledQty,
            unitPrice: item.unitPrice,
            subtotal: item.fulfilledQty * item.unitPrice
          }))

          await tx.invoiceItem.createMany({
            data: oldSOShippedItems.map((item: any) => ({
              invoiceId: unpaidInvoice.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal
            }))
          })

          const invSubtotal = oldSOShippedItems.reduce((sum: any, item: any) => sum + item.subtotal, 0)
          const invTax = invSubtotal * 0.11
          const invTotal = invSubtotal + invTax

          await tx.invoice.update({
            where: { id: unpaidInvoice.id },
            data: {
              subtotal: invSubtotal,
              tax: invTax,
              total: invTotal,
              notes: unpaidInvoice.notes
                ? `${unpaidInvoice.notes} (Disesuaikan otomatis setelah split sisa barang ke SO ${newSONumber})`
                : `Disesuaikan otomatis setelah split sisa barang ke SO ${newSONumber}`
            }
          })
        } else {
          // Batalkan invoice lama jika belum ada barang dikirim sama sekali
          await tx.invoice.update({
            where: { id: unpaidInvoice.id },
            data: {
              status: 'CANCELLED',
              notes: `Dibatalkan karena seluruh barang outstanding dipindahkan ke SO ${newSONumber}`
            }
          })
        }
      }

      // 9. Terbitkan Invoice Baru secara otomatis untuk SO baru hasil split
      const newSOInvCount = await tx.invoice.count({ where: { companyId } })
      const newSOInvNumber = generateNumber('INV', newSOInvCount + 1)
      const newSOInvDueDate = new Date()
      newSOInvDueDate.setDate(newSOInvDueDate.getDate() + 7)

      await tx.invoice.create({
        data: {
          companyId,
          customerId: so.customerId,
          salesOrderId: newSO.id,
          number: newSOInvNumber,
          invoiceDate: new Date(),
          dueDate: newSOInvDueDate,
          notes: `Dibuat otomatis dari hasil split SO ${newSONumber}`,
          subtotal: newSOSubtotal,
          tax: newSOTax,
          total: newSOTotal,
          createdBy: userId,
          status: 'UNPAID',
          items: {
            create: newSOItemsData.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal
            }))
          }
        }
      })

      return { updatedOldSO, newSO }
    })

    if (userId) {
      await createAuditLog({
        companyId,
        userId,
        module: 'penjualan',
        action: 'split_so',
        referenceId: id,
        newValues: {
          oldSONumber: result.updatedOldSO.number,
          newSONumber: result.newSO.number,
          splitTotal: result.newSO.total
        }
      })
    }

    return successResponse(result, `Sisa barang berhasil di-split menjadi Sales Order baru (${result.newSO.number})`)
  } catch (error: any) {
    console.error('Split SO Error:', error)
    return errorResponse(error.message || 'Gagal melakukan pemisahan (split) sisa pesanan', 500)
  }
}

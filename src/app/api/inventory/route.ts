import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

// GET inventory overview
export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const { page, limit, search } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const warehouseId = searchParams.get('warehouseId')

  const where = {
    companyId,
    product: { deletedAt: null },
    ...(warehouseId ? { warehouseId } : {}),
    ...(search ? { product: { name: { contains: search, mode: 'insensitive' as const }, deletedAt: null } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: {
        product: { select: { id: true, code: true, name: true, minStock: true, unit: { select: { symbol: true } } } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { product: { name: 'asc' } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventory.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}

// POST - Stock In
export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const body = await request.json()
  const { productId, warehouseId, quantity, type, notes, reference, fromWarehouseId } = body

  if (!productId || !quantity || quantity <= 0) {
    return errorResponse('Produk dan jumlah wajib diisi')
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // STOCK IN
      if (type === 'IN' || type === 'PURCHASE_RECEIPT') {
        if (!warehouseId) throw new Error('Gudang tujuan wajib dipilih')

        // Upsert inventory
        const inventory = await tx.inventory.upsert({
          where: { companyId_productId_warehouseId: { companyId, productId, warehouseId } },
          create: { companyId, productId, warehouseId, quantity },
          update: { quantity: { increment: quantity } },
        })

        // Create movement record
        const movement = await tx.stockMovement.create({
          data: {
            companyId, productId, toWarehouseId: warehouseId,
            type: type || 'IN', quantity, notes, reference, createdBy: userId,
          },
        })

        return { inventory, movement }
      }

      // STOCK OUT
      if (type === 'OUT' || type === 'SALES_DELIVERY') {
        if (!warehouseId) throw new Error('Gudang asal wajib dipilih')

        // Check stock
        const current = await tx.inventory.findUnique({
          where: { companyId_productId_warehouseId: { companyId, productId, warehouseId } },
        })

        if (!current || current.quantity < quantity) {
          throw new Error('Stok tidak mencukupi')
        }

        const inventory = await tx.inventory.update({
          where: { companyId_productId_warehouseId: { companyId, productId, warehouseId } },
          data: { quantity: { decrement: quantity } },
        })

        const movement = await tx.stockMovement.create({
          data: {
            companyId, productId, fromWarehouseId: warehouseId,
            type: type || 'OUT', quantity, notes, reference, createdBy: userId,
          },
        })

        return { inventory, movement }
      }

      // TRANSFER
      if (type === 'TRANSFER') {
        if (!fromWarehouseId || !warehouseId) throw new Error('Gudang asal dan tujuan wajib dipilih')
        if (fromWarehouseId === warehouseId) throw new Error('Gudang asal dan tujuan tidak boleh sama')

        // Check source stock
        const sourceStock = await tx.inventory.findUnique({
          where: { companyId_productId_warehouseId: { companyId, productId, warehouseId: fromWarehouseId } },
        })

        if (!sourceStock || sourceStock.quantity < quantity) {
          throw new Error('Stok di gudang asal tidak mencukupi')
        }

        // Decrease source
        await tx.inventory.update({
          where: { companyId_productId_warehouseId: { companyId, productId, warehouseId: fromWarehouseId } },
          data: { quantity: { decrement: quantity } },
        })

        // Increase destination
        const destInventory = await tx.inventory.upsert({
          where: { companyId_productId_warehouseId: { companyId, productId, warehouseId } },
          create: { companyId, productId, warehouseId, quantity },
          update: { quantity: { increment: quantity } },
        })

        const movement = await tx.stockMovement.create({
          data: {
            companyId, productId, fromWarehouseId, toWarehouseId: warehouseId,
            type: 'TRANSFER', quantity, notes, reference, createdBy: userId,
          },
        })

        return { inventory: destInventory, movement }
      }

      // ADJUSTMENT
      if (type === 'ADJUSTMENT') {
        if (!warehouseId) throw new Error('Gudang wajib dipilih')

        const inventory = await tx.inventory.upsert({
          where: { companyId_productId_warehouseId: { companyId, productId, warehouseId } },
          create: { companyId, productId, warehouseId, quantity },
          update: { quantity },
        })

        const movement = await tx.stockMovement.create({
          data: {
            companyId, productId, toWarehouseId: warehouseId,
            type: 'ADJUSTMENT', quantity, notes: notes || 'Stok opname', reference, createdBy: userId,
          },
        })

        return { inventory, movement }
      }

      throw new Error('Tipe mutasi tidak valid')
    })

    if (userId) {
      await createAuditLog({
        companyId, userId: userId, module: 'inventori', action: type || 'stock_movement',
        referenceId: result.movement.id,
        newValues: { productId, warehouseId, quantity, type },
      })
    }

    return successResponse(result, 'Mutasi stok berhasil diproses', 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memproses mutasi stok'
    return errorResponse(message, 400)
  }
}

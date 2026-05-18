import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'
import { createAuditLog, getChangedFields } from '@/lib/audit'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const companyId = request.headers.get('x-company-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

    const product = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        category: true,
        unit: true,
        inventories: { include: { warehouse: true } },
      },
    })

    if (!product) return notFoundResponse('Produk tidak ditemukan')
    return successResponse(product)
  } catch (error) {
    console.error('Get product error:', error)
    return errorResponse('Gagal memuat data produk', 500)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const companyId = request.headers.get('x-company-id')
    const userId = request.headers.get('x-user-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

    const existing = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    })
    if (!existing) return notFoundResponse('Produk tidak ditemukan')

    const body = await request.json()
    const { code, name, description, barcode, categoryId, unitId, buyPrice, sellPrice, minStock, status } = body

    if (code && code !== existing.code) {
      const dup = await prisma.product.findUnique({
        where: { companyId_code: { companyId, code } }
      })
      if (dup) return errorResponse('Kode produk sudah digunakan')
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        code: code ?? existing.code,
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        barcode: barcode !== undefined ? barcode : existing.barcode,
        categoryId: categoryId !== undefined ? (categoryId || null) : existing.categoryId,
        unitId: unitId !== undefined ? (unitId || null) : existing.unitId,
        buyPrice: buyPrice ?? existing.buyPrice,
        sellPrice: sellPrice ?? existing.sellPrice,
        minStock: minStock ?? existing.minStock,
        status: status ?? existing.status,
      },
      include: { category: true, unit: true },
    })

    if (userId) {
      const { oldValues, newValues } = getChangedFields(
        existing as unknown as Record<string, unknown>,
        product as unknown as Record<string, unknown>
      )
      await createAuditLog({
        companyId, userId, module: 'produk', action: 'update',
        referenceId: id, oldValues, newValues,
      })
    }

    return successResponse(product, 'Produk berhasil diperbarui')
  } catch (error) {
    console.error('Update product error:', error)
    return errorResponse('Gagal memperbarui produk', 500)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const companyId = request.headers.get('x-company-id')
    const userId = request.headers.get('x-user-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

    const existing = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    })
    if (!existing) return notFoundResponse('Produk tidak ditemukan')

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    if (userId) {
      await createAuditLog({
        companyId, userId, module: 'produk', action: 'delete',
        referenceId: id, oldValues: { name: existing.name, code: existing.code },
      })
    }

    return successResponse(null, 'Produk berhasil dihapus')
  } catch (error) {
    console.error('Delete product error:', error)
    return errorResponse('Gagal menghapus produk', 500)
  }
}

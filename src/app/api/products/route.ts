import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const companyId = request.headers.get('x-company-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

    const { page, limit, search, sortBy, sortOrder } = getSearchParams(request)
    const skip = (page - 1) * limit

    const where = {
      companyId,
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { barcode: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, symbol: true } },
          inventories: {
            select: { quantity: true, warehouse: { select: { name: true } } }
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const productsWithStock = products.map(p => ({
      ...p,
      totalStock: p.inventories.reduce((sum, inv) => sum + inv.quantity, 0),
    }))

    return paginatedResponse(productsWithStock, total, page, limit)
  } catch (error) {
    console.error('Get products error:', error)
    return errorResponse('Gagal memuat data produk', 500)
  }
}

export async function POST(request: Request) {
  try {
    const companyId = request.headers.get('x-company-id')
    const userId = request.headers.get('x-user-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

    const body = await request.json()
    const { code, name, description, barcode, categoryId, unitId, buyPrice, sellPrice, minStock } = body

    if (!code || !name) {
      return errorResponse('Kode dan nama produk wajib diisi')
    }

    const existing = await prisma.product.findUnique({
      where: { companyId_code: { companyId, code } }
    })

    if (existing) {
      return errorResponse('Kode produk sudah digunakan')
    }

    const product = await prisma.product.create({
      data: {
        companyId,
        code,
        name,
        description,
        barcode,
        categoryId: categoryId || null,
        unitId: unitId || null,
        buyPrice: buyPrice || 0,
        sellPrice: sellPrice || 0,
        minStock: minStock || 0,
      },
      include: { category: true, unit: true },
    })

    if (userId) {
      await createAuditLog({
        companyId,
        userId,
        module: 'produk',
        action: 'create',
        referenceId: product.id,
        newValues: { code, name, buyPrice, sellPrice },
      })
    }

    return successResponse(product, 'Produk berhasil ditambahkan', 201)
  } catch (error) {
    console.error('Create product error:', error)
    return errorResponse('Gagal menambahkan produk', 500)
  }
}

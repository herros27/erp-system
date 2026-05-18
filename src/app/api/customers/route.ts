import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === 'true'
  
  const { page, limit, search } = getSearchParams(request)
  const where = { companyId, deletedAt: null, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { code: { contains: search, mode: 'insensitive' as const } }] } : {}) }
  
  if (all) {
    const data = await prisma.customer.findMany({ 
      where, 
      orderBy: { name: 'asc' },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })
    return successResponse(data, 'Berhasil')
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({ 
      where, 
      orderBy: { name: 'asc' }, 
      skip: (page - 1) * limit, 
      take: limit,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    }),
    prisma.customer.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  if (!body.code || !body.name) return errorResponse('Kode dan nama pelanggan wajib diisi')
  const existing = await prisma.customer.findUnique({ where: { companyId_code: { companyId, code: body.code } } })
  if (existing) return errorResponse('Kode pelanggan sudah digunakan')
  const customer = await prisma.customer.create({ 
    data: { 
      companyId, 
      code: body.code, 
      name: body.name, 
      address: body.address, 
      email: body.email, 
      phone: body.phone, 
      taxId: body.taxId,
      parentId: body.parentId || null
    } 
  })
  return successResponse(customer, 'Pelanggan berhasil ditambahkan', 201)
}

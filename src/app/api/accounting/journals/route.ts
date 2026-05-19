import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  
  const where = {
    companyId,
    ...(status ? { status: status as never } : {}),
    ...(search ? { 
      OR: [
        { number: { contains: search, mode: 'insensitive' as const } }, 
        { description: { contains: search, mode: 'insensitive' as const } }
      ] 
    } : {}),
  }
  
  const [data, total] = await Promise.all([
    prisma.journal.findMany({
      where,
      include: { entries: { include: { account: { select: { code: true, name: true } } } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.journal.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  const { date, description, reference, source, entries } = body
  
  if (!date || !description || !entries || entries.length < 2) {
    return errorResponse('Data jurnal tidak lengkap. Minimal 2 baris (Debit/Kredit)')
  }

  // Validate Double Entry
  let totalDebit = 0
  let totalCredit = 0
  
  for (const entry of entries) {
    totalDebit += entry.debit || 0
    totalCredit += entry.credit || 0
  }
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) { // Floating point comparison tolerance
    return errorResponse(`Jurnal tidak seimbang. Debit: ${totalDebit}, Kredit: ${totalCredit}`)
  }

  const count = await prisma.journal.count({ where: { companyId } })
  const number = generateNumber('JV', count + 1)

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const journal = await tx.journal.create({
        data: {
          companyId, number, date: new Date(date), description, reference, source,
          status: 'POSTED',
          totalDebit, totalCredit, createdBy: userId,
          entries: {
            create: entries.map((e: any) => ({
              accountId: e.accountId,
              debit: e.debit || 0,
              credit: e.credit || 0,
              description: e.description
            }))
          }
        },
        include: { entries: true }
      })

      // Update account balances immediately
      for (const entry of entries) {
        if (entry.debit > 0 || entry.credit > 0) {
          const account = await tx.account.findUnique({ where: { id: entry.accountId } })
          if (account) {
            // Very simplified balance calculation
            // Real accounting considers NORMAL BALANCE (Debit/Credit) based on AccountType
            // For this implementation, we just add debit, subtract credit
            let balanceChange = entry.debit - entry.credit;
            
            // Adjust sign based on account type normally
            if (account.type === 'LIABILITY' || account.type === 'EQUITY' || account.type === 'REVENUE') {
               balanceChange = entry.credit - entry.debit;
            }
            
            await tx.account.update({
              where: { id: account.id },
              data: { balance: { increment: balanceChange } }
            })
          }
        }
      }

      return journal;
    });

    if (userId) {
      await createAuditLog({ 
        companyId, userId, module: 'akuntansi', action: 'create_journal', 
        referenceId: result.id, newValues: { number, description, totalDebit } 
      })
    }
    
    return successResponse(result, 'Jurnal berhasil diposting', 201)
  } catch (error) {
    console.error("Journal posting error", error);
    return errorResponse('Gagal memposting jurnal')
  }
}

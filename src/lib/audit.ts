import prisma from '@/lib/prisma'

interface AuditLogParams {
  companyId: string
  userId: string
  module: string
  action: string
  referenceId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: params.module,
        action: params.action,
        referenceId: params.referenceId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress,
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export function getChangedFields(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } {
  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}

  for (const key of Object.keys(newObj)) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      oldValues[key] = oldObj[key]
      newValues[key] = newObj[key]
    }
  }

  return { oldValues, newValues }
}

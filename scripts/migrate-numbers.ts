import { prisma } from '../src/lib/prisma'

async function migrateModel(modelName: string, prismaModel: any, prefix: string, dateField: string) {
  console.log(`\nMigrating ${modelName} with prefix ${prefix}...`)
  
  const records = await prismaModel.findMany()
  let count = 0
  
  for (const record of records) {
    const oldNumber = record.number
    if (!oldNumber) continue
    
    // Extract actual transaction date to determine true year and month
    const dateVal = record[dateField] || record.createdAt || new Date()
    const d = new Date(dateVal)
    const yearStr = String(d.getFullYear()).slice(-2) // e.g. "26"
    const monthStr = String(d.getMonth() + 1).padStart(2, '0') // e.g. "05"
    
    let seq = 1
    
    if (oldNumber.includes('/')) {
      // Handle slash format: PREFIX/YYYYMM/XXXX e.g. SO/202605/0012
      const parts = oldNumber.split('/')
      if (parts.length === 3) {
        const parsedSeq = parseInt(parts[2], 10)
        if (!isNaN(parsedSeq)) {
          seq = parsedSeq
        }
      }
    } else {
      // Handle digit formats
      const match = oldNumber.match(/\d+$/)
      if (match) {
        const digits = match[0]
        if (digits.length === 9) {
          // e.g. "260055014" (mis-migrated 9-digit format) -> extract last 3 digits
          seq = parseInt(digits.slice(6), 10)
        } else if (digits.length === 8) {
          // e.g. "26005014" (correct 8-digit format) -> extract last 3 digits
          seq = parseInt(digits.slice(5), 10)
        } else if (digits.length >= 4) {
          // e.g. "26000012" -> slice off 2-digit year to get sequence
          seq = parseInt(digits.slice(2), 10)
        } else {
          seq = parseInt(digits, 10)
        }
      }
    }
    
    if (isNaN(seq)) {
      seq = 1
    }
    
    // Construct new 8-digit number format: PREFIX + YY + "0" + MM + XXX
    const seqStr = String(seq).padStart(3, '0') // e.g. "012"
    const newNumber = `${prefix}${yearStr}0${monthStr}${seqStr}` // e.g. "SO26005012"
    
    if (oldNumber !== newNumber) {
      await prismaModel.update({
        where: { id: record.id },
        data: { number: newNumber }
      })
      console.log(`  Updated: ${oldNumber} -> ${newNumber}`)
      count++
    }
  }
  
  console.log(`Completed ${modelName}. Total migrated/updated: ${count}`)
}

async function main() {
  console.log('--- STARTING TRANSACTION NUMBER MIGRATION TO NEW 8-DIGIT FORMAT ---')
  
  try {
    // Migrate all 5 models with their respective transaction date fields
    await migrateModel('SalesOrder', prisma.salesOrder, 'SO', 'orderDate')
    await migrateModel('DeliveryOrder (Surat Jalan)', prisma.deliveryOrder, 'SJ', 'deliveryDate')
    await migrateModel('Invoice', prisma.invoice, 'INV', 'invoiceDate')
    await migrateModel('PurchaseOrder', prisma.purchaseOrder, 'PO', 'orderDate')
    await migrateModel('Payment', prisma.payment, 'PAY', 'paymentDate')
    
    console.log('\n--- MIGRATION COMPLETED SUCCESSFULLY ---')
  } catch (error) {
    console.error('\nMigration failed with error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

import { prisma } from '../src/lib/prisma'
import * as bcrypt from 'bcryptjs'

async function main() {
  console.log('Seeding database...')

  // 1. Roles & Permissions
  const MODULES = [
    'dashboard',
    'produk',
    'kategori',
    'supplier',
    'pelanggan',
    'gudang',
    'satuan',
    'inventori',
    'pembelian',
    'penjualan',
    'akuntansi',
    'laporan',
    'persetujuan',
    'audit',
    'perusahaan',
    'pengguna',
  ]
  const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve']

  console.log('Seeding Permissions...')
  
  // Full Access permission
  const permAll = await prisma.permission.upsert({
    where: { name: '*' },
    update: {},
    create: { module: 'all', action: 'all', name: '*', description: 'Akses Semua Fitur' }
  })

  // Module granular permissions
  const permissionsMap: { [key: string]: any } = {}
  permissionsMap['*'] = permAll

  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const pName = `${module}.${action}`
      const perm = await prisma.permission.upsert({
        where: { name: pName },
        update: {},
        create: {
          module,
          action,
          name: pName,
          description: `Izin untuk ${action} pada modul ${module}`
        }
      })
      permissionsMap[pName] = perm
    }
  }

  // Seeding Roles
  console.log('Seeding Roles...')
  
  const roleSuperAdmin = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: {},
    create: { name: 'superadmin', displayName: 'Super Admin', description: 'Akses penuh seluruh modul sistem' }
  })

  const roleAdminA = await prisma.role.upsert({
    where: { name: 'admin_accounting' },
    update: {},
    create: { name: 'admin_accounting', displayName: 'Admin Akuntansi', description: 'Akses penuh modul akuntansi' }
  })
  
  const roleAdminW = await prisma.role.upsert({
    where: { name: 'admin_warehouse' },
    update: {},
    create: { name: 'admin_warehouse', displayName: 'Admin Gudang', description: 'Akses penuh modul inventori' }
  })
  
  const roleStaffP = await prisma.role.upsert({
    where: { name: 'staff_purchasing' },
    update: {},
    create: { name: 'staff_purchasing', displayName: 'Staff Pembelian', description: 'Akses modul pembelian' }
  })

  const roleStaffS = await prisma.role.upsert({
    where: { name: 'staff_sales' },
    update: {},
    create: { name: 'staff_sales', displayName: 'Staff Penjualan', description: 'Akses modul penjualan' }
  })

  // Link Roles to specific permissions
  const linkRolePermissions = async (roleId: string, permNames: string[]) => {
    // Delete existing permissions for this role to make sure we refresh correctly
    await prisma.rolePermission.deleteMany({
      where: { roleId }
    })
    
    for (const pName of permNames) {
      const perm = permissionsMap[pName]
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: perm.id } },
          update: {},
          create: { roleId, permissionId: perm.id }
        })
      }
    }
  }

  // 1. Super Admin: full access
  await linkRolePermissions(roleSuperAdmin.id, ['*'])

  // 2. Admin Akuntansi: dashboard, akuntansi, laporan, persetujuan
  await linkRolePermissions(roleAdminA.id, [
    'dashboard.view',
    'akuntansi.view', 'akuntansi.create', 'akuntansi.edit', 'akuntansi.delete',
    'laporan.view',
    'persetujuan.view', 'persetujuan.approve'
  ])

  // 3. Admin Gudang: dashboard, gudang, inventori, produk, kategori, satuan
  await linkRolePermissions(roleAdminW.id, [
    'dashboard.view',
    'gudang.view', 'gudang.create', 'gudang.edit', 'gudang.delete',
    'inventori.view', 'inventori.create', 'inventori.edit',
    'produk.view', 'produk.create', 'produk.edit', 'produk.delete',
    'kategori.view', 'kategori.create', 'kategori.edit', 'kategori.delete',
    'satuan.view', 'satuan.create', 'satuan.edit', 'satuan.delete'
  ])

  // 4. Staff Pembelian: dashboard, pembelian, supplier
  await linkRolePermissions(roleStaffP.id, [
    'dashboard.view',
    'pembelian.view', 'pembelian.create', 'pembelian.edit',
    'supplier.view', 'supplier.create', 'supplier.edit'
  ])

  // 5. Staff Penjualan: dashboard, penjualan, pelanggan
  await linkRolePermissions(roleStaffS.id, [
    'dashboard.view',
    'penjualan.view', 'penjualan.create', 'penjualan.edit',
    'pelanggan.view', 'pelanggan.create', 'pelanggan.edit'
  ])

  // 2. Companies
  const ptMaju = await prisma.company.upsert({
    where: { code: 'MJA' },
    update: {},
    create: {
      name: 'PT Maju Jaya Abadi',
      code: 'MJA',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat',
      email: 'info@majujaya.co.id',
      phone: '021-5551234',
      taxId: '01.234.567.8-091.000',
    }
  })

  const ptNusantara = await prisma.company.upsert({
    where: { code: 'NTG' },
    update: {},
    create: {
      name: 'PT Nusantara Teknologi',
      code: 'NTG',
      address: 'Jl. Gatot Subroto Kav. 45, Bandung',
      email: 'contact@nusantaratech.id',
      phone: '022-8884321',
      taxId: '02.987.654.3-412.000',
    }
  })

  // 3. Users
  const pwd = await bcrypt.hash('password123', 12)

  const userSuperAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@erp.co.id' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@erp.co.id',
      password: pwd,
    }
  })
  
  const userAdmin = await prisma.user.upsert({
    where: { email: 'admin@erp.co.id' },
    update: {},
    create: {
      name: 'Budi Akuntan',
      email: 'admin@erp.co.id',
      password: pwd,
    }
  })
  
  const userGudang = await prisma.user.upsert({
    where: { email: 'gudang@erp.co.id' },
    update: {},
    create: {
      name: 'Agus Gudang',
      email: 'gudang@erp.co.id',
      password: pwd,
    }
  })

  const userPembelian = await prisma.user.upsert({
    where: { email: 'pembelian@erp.co.id' },
    update: {},
    create: {
      name: 'Siti Pembelian',
      email: 'pembelian@erp.co.id',
      password: pwd,
    }
  })

  const userPenjualan = await prisma.user.upsert({
    where: { email: 'penjualan@erp.co.id' },
    update: {},
    create: {
      name: 'Roni Penjualan',
      email: 'penjualan@erp.co.id',
      password: pwd,
    }
  })

  // Link Users to Companies
  const companies = [ptMaju, ptNusantara];
  
  for (const comp of companies) {
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: userSuperAdmin.id, companyId: comp.id } },
      update: {}, create: { userId: userSuperAdmin.id, companyId: comp.id, roleId: roleSuperAdmin.id, isDefault: comp.code === 'MJA' }
    })
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: userAdmin.id, companyId: comp.id } },
      update: {}, create: { userId: userAdmin.id, companyId: comp.id, roleId: roleAdminA.id, isDefault: comp.code === 'MJA' }
    })
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: userGudang.id, companyId: comp.id } },
      update: {}, create: { userId: userGudang.id, companyId: comp.id, roleId: roleAdminW.id, isDefault: comp.code === 'MJA' }
    })
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: userPembelian.id, companyId: comp.id } },
      update: {}, create: { userId: userPembelian.id, companyId: comp.id, roleId: roleStaffP.id, isDefault: comp.code === 'MJA' }
    })
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: userPenjualan.id, companyId: comp.id } },
      update: {}, create: { userId: userPenjualan.id, companyId: comp.id, roleId: roleStaffS.id, isDefault: comp.code === 'MJA' }
    })
  }

  // Generate Base Data for PT Maju Jaya
  const existingWarehouse = await prisma.warehouse.findFirst({
    where: { companyId: ptMaju.id }
  })
  
  if (!existingWarehouse) {
    console.log('Generating Base Data for PT Maju Jaya...')
    // 4. Units
    const unitPcs = await prisma.unit.create({ data: { companyId: ptMaju.id, name: 'Pieces', symbol: 'Pcs' } })
    const unitBox = await prisma.unit.create({ data: { companyId: ptMaju.id, name: 'Box', symbol: 'Box' } })

    // 5. Categories
    const catElektronik = await prisma.category.create({ data: { companyId: ptMaju.id, name: 'Elektronik' } })
    const catFurniture = await prisma.category.create({ data: { companyId: ptMaju.id, name: 'Furniture Kantor' } })

    // 6. Warehouses
    const gudangUtama = await prisma.warehouse.create({ data: { companyId: ptMaju.id, code: 'WH-01', name: 'Gudang Utama Jakarta', address: 'Kawasan Industri Pulogadung' } })
    
    // 7. Suppliers & Customers
    const supEl = await prisma.supplier.create({ data: { companyId: ptMaju.id, code: 'SUP-001', name: 'PT Surya Elektronik', phone: '08123456789' } })
    const custRtl = await prisma.customer.create({ data: { companyId: ptMaju.id, code: 'CUST-001', name: 'Toko Maju Bersama', phone: '08987654321' } })

    // 8. Products
    const prodLaptop = await prisma.product.create({
      data: {
        companyId: ptMaju.id,
        categoryId: catElektronik.id,
        unitId: unitPcs.id,
        code: 'PRD-LPT-01',
        name: 'Laptop Lenovo ThinkPad',
        buyPrice: 12000000,
        sellPrice: 15000000,
        minStock: 5,
      }
    })

    const prodMeja = await prisma.product.create({
      data: {
        companyId: ptMaju.id,
        categoryId: catFurniture.id,
        unitId: unitPcs.id,
        code: 'PRD-MJ-01',
        name: 'Meja Kerja Minimalis',
        buyPrice: 800000,
        sellPrice: 1200000,
        minStock: 10,
      }
    })

    // 9. Initial Inventory
    await prisma.inventory.create({
      data: {
        companyId: ptMaju.id,
        productId: prodLaptop.id,
        warehouseId: gudangUtama.id,
        quantity: 15
      }
    })
    
    await prisma.inventory.create({
      data: {
        companyId: ptMaju.id,
        productId: prodMeja.id,
        warehouseId: gudangUtama.id,
        quantity: 20
      }
    })

    // 10. Chart of Accounts (Indonesian Standard)
    const coaAsset = await prisma.account.create({ data: { companyId: ptMaju.id, code: '1000', name: 'Aset', type: 'ASSET', level: 1 } })
    const coaKas = await prisma.account.create({ data: { companyId: ptMaju.id, parentId: coaAsset.id, code: '1100', name: 'Kas & Bank', type: 'ASSET', level: 2 } })
    const coaPersediaan = await prisma.account.create({ data: { companyId: ptMaju.id, parentId: coaAsset.id, code: '1200', name: 'Persediaan Barang', type: 'ASSET', level: 2 } })
    
    const coaLiab = await prisma.account.create({ data: { companyId: ptMaju.id, code: '2000', name: 'Kewajiban', type: 'LIABILITY', level: 1 } })
    const coaHutang = await prisma.account.create({ data: { companyId: ptMaju.id, parentId: coaLiab.id, code: '2100', name: 'Hutang Usaha', type: 'LIABILITY', level: 2 } })

    const coaEquity = await prisma.account.create({ data: { companyId: ptMaju.id, code: '3000', name: 'Ekuitas', type: 'EQUITY', level: 1 } })
    const coaModal = await prisma.account.create({ data: { companyId: ptMaju.id, parentId: coaEquity.id, code: '3100', name: 'Modal Disetor', type: 'EQUITY', level: 2 } })

    const coaRev = await prisma.account.create({ data: { companyId: ptMaju.id, code: '4000', name: 'Pendapatan', type: 'REVENUE', level: 1 } })
    const coaPenjualan = await prisma.account.create({ data: { companyId: ptMaju.id, parentId: coaRev.id, code: '4100', name: 'Pendapatan Penjualan', type: 'REVENUE', level: 2 } })

    const coaExp = await prisma.account.create({ data: { companyId: ptMaju.id, code: '5000', name: 'Beban', type: 'EXPENSE', level: 1 } })
    const coaHPP = await prisma.account.create({ data: { companyId: ptMaju.id, parentId: coaExp.id, code: '5100', name: 'Harga Pokok Penjualan', type: 'EXPENSE', level: 2 } })

    // 11. Initial Capital Journal
    await prisma.journal.create({
      data: {
        companyId: ptMaju.id,
        number: 'JV/202401/0001',
        date: new Date(),
        description: 'Setoran Modal Awal',
        status: 'POSTED',
        totalDebit: 500000000,
        totalCredit: 500000000,
        createdBy: userAdmin.id,
        entries: {
          create: [
            { accountId: coaKas.id, debit: 500000000, credit: 0, description: 'Kas Masuk' },
            { accountId: coaModal.id, debit: 0, credit: 500000000, description: 'Modal Disetor' }
          ]
        }
      }
    })

    // Update Balances for initial capital
    await prisma.account.update({ where: { id: coaKas.id }, data: { balance: 500000000 } })
    await prisma.account.update({ where: { id: coaModal.id }, data: { balance: 500000000 } })
  } else {
    console.log('PT Maju Jaya base data already exists. Skipping base data seeding.')
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

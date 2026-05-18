import { Client } from 'pg';

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Add INDENT to enum
    try {
      await client.query(`ALTER TYPE "SalesOrderStatus" ADD VALUE 'INDENT';`);
      console.log('Added INDENT to SalesOrderStatus enum');
    } catch (e: any) {
      if (e.code === '42710') {
        console.log('Enum value INDENT already exists');
      } else {
        throw e;
      }
    }

    // 2. Add columns to sales_order_items
    try {
      await client.query(`ALTER TABLE "sales_order_items" ADD COLUMN "fulfilled_qty" INTEGER NOT NULL DEFAULT 0;`);
      console.log('Added fulfilled_qty column');
    } catch (e: any) {
      if (e.code === '42701') {
        console.log('Column fulfilled_qty already exists');
      } else {
        throw e;
      }
    }

    try {
      await client.query(`ALTER TABLE "sales_order_items" ADD COLUMN "indent_qty" INTEGER NOT NULL DEFAULT 0;`);
      console.log('Added indent_qty column');
    } catch (e: any) {
      if (e.code === '42701') {
        console.log('Column indent_qty already exists');
      } else {
        throw e;
      }
    }

    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();

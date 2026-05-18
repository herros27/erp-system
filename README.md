# ERP Indonesia - Sistem Enterprise Resource Planning

Sistem ERP fullstack berbasis Next.js dengan dukungan multi-perusahaan, bahasa Indonesia, dan arsitektur enterprise-grade.

## Teknologi Utama
- **Frontend & Backend:** Next.js 14 (App Router)
- **Database:** PostgreSQL & Prisma ORM
- **Styling:** Tailwind CSS, shadcn/ui (customized)
- **State Management:** Zustand
- **Validasi:** Zod, React Hook Form
- **Authentication:** JWT (JSON Web Tokens) dengan HttpOnly Cookies

## Modul Tersedia
1. **Dashboard** (Summary, Charts, Alerts)
2. **Master Data** (Produk, Kategori, Satuan, Supplier, Pelanggan, Gudang, Perusahaan)
3. **Inventori** (Barang Masuk, Barang Keluar, Transfer, Mutasi Stok)
4. **Pembelian** (Purchase Order)
5. **Penjualan** (Sales Order)
6. **Akuntansi** (Jurnal Umum, Buku Besar, Chart of Accounts - Double Entry)

---

## Persiapan & Instalasi

### 1. Persyaratan Sistem
- Node.js versi 18 atau terbaru (Disarankan v20/v22 LTS)
- PostgreSQL (Bisa menggunakan Docker atau instalasi lokal)
- Docker Desktop (Opsional, untuk menjalankan database secara instan)

### 2. Konfigurasi Lingkungan
Duplikat file `.env.example` menjadi `.env` dan pastikan konfigurasi sudah sesuai.
```bash
cp .env.example .env
```

Jika menggunakan Docker Compose untuk PostgreSQL, pastikan port `5432` kosong.

### 3. Menjalankan Database via Docker (Opsional tapi disarankan)
Jika tidak memiliki PostgreSQL lokal:
```bash
docker compose up -d
```
*Tunggu beberapa detik hingga database siap.*

### 4. Instalasi Dependensi & Setup Database
Buka terminal dan jalankan:
```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```
**Perhatian:** Perintah `npx prisma db seed` sangat penting karena ini akan membuat akun admin, perusahaan demo, Chart of Accounts, dan data awal agar aplikasi bisa langsung digunakan.

### 5. Menjalankan Aplikasi
```bash
npm run dev
```
Buka browser di `http://localhost:3000`

---

## Panduan Penggunaan Awal

Gunakan salah satu akun demo berikut untuk masuk:

1. **Admin Akuntansi (Akses Penuh):**
   - Email: `admin@erp.co.id`
   - Sandi: `password123`

2. **Admin Gudang (Modul Inventori):**
   - Email: `gudang@erp.co.id`
   - Sandi: `password123`

3. **Staff Pembelian (Modul Pembelian):**
   - Email: `pembelian@erp.co.id`
   - Sandi: `password123`

### Fitur Multi-Perusahaan
Setelah login, Anda bisa menggunakan **Dropdown Perusahaan** di pojok kanan atas Header untuk berpindah antara "PT Maju Jaya Abadi" dan "PT Nusantara Teknologi". Data sepenuhnya terisolasi antar perusahaan.

---

## Arsitektur & Logika Penting

1. **Transactional Inventory:** Mutasi stok diatur menggunakan Prisma `$transaction` API untuk memastikan konsistensi dan mencegah terjadinya stok negatif atau *race conditions*.
2. **Double-Entry Accounting:** Modul Akuntansi mendukung logika debet/kredit. Sistem menolak jurnal yang tidak seimbang.
3. **RBAC:** Kontrol Akses berbasis Peran dan Perusahaan divalidasi ganda di Middleware dan API Routes.
4. **Audit Trail:** Segala bentuk mutasi dan pembuatan dokumen akan otomatis dicatat dalam database (siapa, kapan, perubahan nilai).

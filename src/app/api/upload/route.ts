import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return errorResponse('Tidak ada file yang diunggah', 400)
    }

    // Validasi tipe file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return errorResponse('Tipe file tidak didukung. Harap unggah gambar (JPG/PNG/WEBP) atau PDF.', 400)
    }

    // Validasi ukuran (maksimal 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return errorResponse('Ukuran file maksimal 5MB.', 400)
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Bersihkan nama file dari karakter aneh
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}-${originalName}`

    // Buat path penyimpanan di public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Pastikan folder exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err
    }

    const filepath = path.join(uploadDir, uniqueFilename)
    
    // Tulis file ke disk
    await writeFile(filepath, buffer)

    // Kembalikan URL relatif yang bisa diakses publik
    const fileUrl = `/uploads/${uniqueFilename}`

    return successResponse({ 
      fileUrl, 
      fileName: file.name 
    }, 'File berhasil diunggah')

  } catch (error: any) {
    console.error('Upload error:', error)
    return errorResponse(error.message || 'Terjadi kesalahan saat mengunggah file', 500)
  }
}

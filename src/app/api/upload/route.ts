import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Konfigurasi Supabase Storage (.env) belum lengkap.", 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("Tidak ada file yang diunggah", 400);
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      return errorResponse(
        "Tipe file tidak didukung. Harap unggah gambar (JPG/PNG/WEBP) atau PDF.",
        400
      );
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return errorResponse("Ukuran file maksimal 5MB.", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean filename
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const uniqueFilename = `${Date.now()}-${originalName}`;

    // Upload to Supabase Storage Bucket 'erp-uploads'
    const { error: uploadError } = await supabase.storage
      .from("erp-uploads")
      .upload(uniqueFilename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError);
      return errorResponse(
        `Gagal mengunggah file ke cloud storage: ${uploadError.message}`,
        500
      );
    }

    // Get public accessible URL
    const { data: publicUrlData } = supabase.storage
      .from("erp-uploads")
      .getPublicUrl(uniqueFilename);

    return successResponse(
      {
        fileUrl: publicUrlData.publicUrl,
        fileName: file.name,
      },
      "File berhasil diunggah"
    );
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return errorResponse(
      error.message || "Terjadi kesalahan saat mengunggah file",
      500
    );
  }
}

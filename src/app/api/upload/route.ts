import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autorizado." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = (formData.get("tipo") as string) || "comprobante";

  if (!file || file.size === 0) {
    return NextResponse.json({ mensaje: "No se recibió ningún archivo." }, { status: 400 });
  }

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json({ mensaje: "Solo se permiten imágenes JPG, PNG o WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ mensaje: "La imagen no puede superar 5 MB." }, { status: 400 });
  }

  // Solo admins pueden subir el QR de configuración
  if (tipo === "qr") {
    const rol = (session.user as unknown as { rol?: string }).rol;
    if (rol !== "ADMIN") {
      return NextResponse.json({ mensaje: "Solo administradores pueden subir el QR." }, { status: 403 });
    }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const nombre = `club10k/${tipo}-${Date.now()}.${ext}`;

  const blob = await put(nombre, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}

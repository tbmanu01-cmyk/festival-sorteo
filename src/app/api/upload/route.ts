import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// El `Content-Type` que manda el navegador (file.type) lo controla quien
// sube el archivo — no basta para confiar en que el contenido real sea una
// imagen. Se valida además la firma real de los primeros bytes (magic
// numbers) antes de guardar nada.
function esImagenValida(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return true;
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return true;
  return false;
}

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

  const cabecera = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!esImagenValida(cabecera)) {
    return NextResponse.json({ mensaje: "El archivo no es una imagen válida." }, { status: 400 });
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

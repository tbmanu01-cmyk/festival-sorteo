import { NextRequest } from "next/server";

export function obtenerIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "desconocida"
  );
}

export async function registrarAuditoria(opts: {
  userId?: string | null;
  accion: string;
  detalle?: string;
  ip?: string;
}): Promise<void> {
  try {
    const { prisma } = await import("./prisma");
    await prisma.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        accion: opts.accion,
        detalle: opts.detalle ?? null,
        ip: opts.ip ?? null,
      },
    });
  } catch {
    // El audit log nunca debe romper el flujo principal
  }
}

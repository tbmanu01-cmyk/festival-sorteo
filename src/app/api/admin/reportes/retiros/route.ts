import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const retiros = await prisma.retiro.findMany({
    where: { estado: { in: ["PAGADO", "RECHAZADO", "APROBADO"] } },
    include: {
      user: {
        select: {
          nombre: true, apellido: true, correo: true,
          celular: true, banco: true, tipoCuenta: true, cuentaBancaria: true,
        },
      },
    },
    orderBy: { fecha: "desc" },
  });

  const totalPagado = retiros
    .filter((r) => r.estado === "PAGADO")
    .reduce((s, r) => s + (r.montoNeto ?? r.monto), 0);

  return NextResponse.json({ retiros, totalPagado });
}

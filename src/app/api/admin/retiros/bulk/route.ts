import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";
import { registrarAuditoria } from "@/lib/auditoria";
import { crearNotificacion } from "@/lib/notificaciones";

export async function POST(req: NextRequest) {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const adminId = (session.user as unknown as { id: string }).id;
  const body = await req.json().catch(() => ({})) as { ids?: string[] };

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ mensaje: "Se requiere al menos un ID." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const resultados: { id: string; ok: boolean; nombre: string; monto: number; mensaje: string }[] = [];

  for (const id of body.ids) {
    try {
      const retiro = await prisma.retiro.findUnique({
        where: { id },
        include: { user: { select: { nombre: true, apellido: true, correo: true } } },
      });

      if (!retiro) {
        resultados.push({ id, ok: false, nombre: "—", monto: 0, mensaje: "No encontrado." });
        continue;
      }
      if (!["PENDIENTE", "PRE_APROBADO"].includes(retiro.estado)) {
        resultados.push({ id, ok: false, nombre: `${retiro.user.nombre} ${retiro.user.apellido}`, monto: retiro.monto, mensaje: "Ya procesado." });
        continue;
      }

      const montoFinal = retiro.montoNeto ?? retiro.monto;

      await prisma.$transaction([
        prisma.retiro.update({ where: { id }, data: { estado: "PAGADO" } }),
        prisma.transaccion.create({
          data: {
            userId: retiro.userId,
            tipo: "RETIRO",
            monto: -montoFinal,
            descripcion: `Retiro pagado (masivo) — $${montoFinal.toLocaleString("es-CO")}${retiro.retencion ? ` (ret. $${retiro.retencion.toLocaleString("es-CO")})` : ""}`,
            referencia: id,
          },
        }),
      ]);

      await registrarAuditoria({
        userId: adminId,
        accion: "RETIRO_APROBADO",
        detalle: `Retiro ${id} aprobado en lote. Neto: $${montoFinal.toLocaleString("es-CO")}`,
        ip: req.headers.get("x-forwarded-for") ?? "unknown",
      });

      // Notificación y email fire-and-forget
      Promise.all([
        crearNotificacion(prisma, {
          tipo: "RETIRO",
          titulo: "¡Retiro aprobado para consignación! 💸",
          cuerpo: `Tu retiro de $${montoFinal.toLocaleString("es-CO")} COP fue aprobado y será consignado a ${retiro.cuentaDestino}.`,
          usuarioId: retiro.userId,
        }),
        import("@/lib/email").then(({ enviarRetiroAprobado }) =>
          enviarRetiroAprobado({
            correo: retiro.user.correo,
            nombre: retiro.user.nombre,
            monto: montoFinal,
            cuentaDestino: retiro.cuentaDestino,
          })
        ),
      ]).catch(() => undefined);

      resultados.push({ id, ok: true, nombre: `${retiro.user.nombre} ${retiro.user.apellido}`, monto: montoFinal, mensaje: "Aprobado." });
    } catch {
      resultados.push({ id, ok: false, nombre: "—", monto: 0, mensaje: "Error interno." });
    }
  }

  const ok    = resultados.filter((r) => r.ok).length;
  const error = resultados.filter((r) => !r.ok).length;

  return NextResponse.json({ ok, error, resultados });
}

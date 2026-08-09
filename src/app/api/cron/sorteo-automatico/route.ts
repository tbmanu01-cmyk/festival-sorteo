import { NextResponse } from "next/server";

// Disparado por un cron EXTERNO (no Vercel Cron — el plan actual solo permite
// 1 ejecución diaria, insuficiente para respetar la hora exacta que el admin
// programa en Config.fechaSorteo) cada pocos minutos. Si ya se cumplió la
// fecha/hora programada, ejecuta la selección principal automáticamente y
// limpia fechaSorteo para no volver a dispararse ni dejar el freeze pegado.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const config = await prisma.config.findUnique({ where: { id: "singleton" }, select: { fechaSorteo: true } });
  if (!config?.fechaSorteo || config.fechaSorteo.getTime() > Date.now()) {
    return NextResponse.json({ mensaje: "Nada que ejecutar todavía.", ejecutado: false });
  }

  const { ejecutarSeleccionPrincipal } = await import("@/lib/ejecutarSeleccionPrincipal");
  const resultado = await ejecutarSeleccionPrincipal({ modo: "auto" });

  if (!resultado.ok) {
    console.error("[cron sorteo-automatico] no se pudo ejecutar:", resultado.mensaje);
    return NextResponse.json({ mensaje: resultado.mensaje, ejecutado: false }, { status: resultado.status });
  }

  // Limpia la fecha programada — evita re-disparar en el próximo tick del
  // cron y libera el freeze de compra. El admin (o la automatización de
  // cadencia, cuando exista) debe fijar la siguiente fecha.
  await prisma.config.update({ where: { id: "singleton" }, data: { fechaSorteo: null } });

  return NextResponse.json({ mensaje: "Selección ejecutada automáticamente.", ejecutado: true, resumen: resultado.resumen });
}

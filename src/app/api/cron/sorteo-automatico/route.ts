import { NextResponse } from "next/server";

// Disparado por un cron EXTERNO (no Vercel Cron — el plan actual solo permite
// 1 ejecución diaria, insuficiente para respetar la hora exacta que el admin
// programa por tier) cada pocos minutos. Recorre los tipos de membresía
// activos y ejecuta la selección de cada uno que ya cumplió su fechaSorteo,
// limpiándola después para no volver a dispararse ni dejar el freeze pegado.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const { ejecutarSeleccionPrincipal } = await import("@/lib/ejecutarSeleccionPrincipal");

  const tiers = await prisma.tipoMembresia.findMany({
    where: { activo: true, fechaSorteo: { lte: new Date() } },
  });

  if (tiers.length === 0) {
    return NextResponse.json({ mensaje: "Nada que ejecutar todavía.", ejecutado: false });
  }

  const resultados = [];
  for (const tier of tiers) {
    const resultado = await ejecutarSeleccionPrincipal({ tipoMembresiaId: tier.id, modo: "auto" });
    if (!resultado.ok) {
      console.error(`[cron sorteo-automatico] tier ${tier.slug} no se pudo ejecutar:`, resultado.mensaje);
      resultados.push({ tier: tier.slug, ejecutado: false, mensaje: resultado.mensaje });
      continue;
    }
    // Limpia la fecha programada — evita re-disparar en el próximo tick del
    // cron y libera el freeze de compra de este tier. El admin debe fijar
    // la siguiente fecha cuando quiera programar la próxima ronda.
    await prisma.tipoMembresia.update({ where: { id: tier.id }, data: { fechaSorteo: null } });
    resultados.push({ tier: tier.slug, ejecutado: true, resumen: resultado.resumen });
  }

  return NextResponse.json({ mensaje: "Procesado.", resultados });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NIVELES = [
  { min: 50, nombre: "Diamante", emoji: "💎", color: "cyan" },
  { min: 20, nombre: "Platino",  emoji: "🔮", color: "purple" },
  { min: 10, nombre: "Oro",      emoji: "🥇", color: "yellow" },
  { min: 5,  nombre: "Plata",    emoji: "🥈", color: "gray" },
  { min: 1,  nombre: "Bronce",   emoji: "🥉", color: "orange" },
  { min: 0,  nombre: "Semilla",  emoji: "🌱", color: "green" },
];

function calcularNivel(activos: number) {
  return NIVELES.find((n) => activos >= n.min) ?? NIVELES[NIVELES.length - 1];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const rol = (session?.user as unknown as { rol?: string })?.rol;
    if (!session?.user || rol !== "ADMIN") {
      return NextResponse.json({ mensaje: "No autorizado." }, { status: 403 });
    }

    const { prisma } = await import("@/lib/prisma");

    // ── Todas las relaciones referido ─────────────────────────────────────
    const relaciones = await prisma.referido.findMany({
      select: { referidorId: true, referidoId: true, compro: true },
    });

    if (relaciones.length === 0) return NextResponse.json({ red: [], resumen: { referidores: 0, totalActivos: 0, totalMembresiasRed: 0 } });

    const referidorIds = [...new Set(relaciones.map((r) => r.referidorId))];
    const referidoIds  = [...new Set(relaciones.map((r) => r.referidoId))];

    // ── Datos de usuarios referidores ─────────────────────────────────────
    const usuarios = await prisma.user.findMany({
      where: { id: { in: referidorIds } },
      select: { id: true, nombre: true, apellido: true, correo: true, fechaRegistro: true },
    });

    // ── Datos de usuarios referidos (para lista expandible) ───────────────
    const usuariosReferidos = await prisma.user.findMany({
      where: { id: { in: referidoIds } },
      select: { id: true, nombre: true, apellido: true, correo: true },
    });
    const refMap = new Map(usuariosReferidos.map((u) => [u.id, u]));

    // ── Membresías vendidas por cada referido ─────────────────────────────
    const cajasRaw = await prisma.caja.findMany({
      where: { userId: { in: referidoIds }, estado: "VENDIDA" },
      select: { userId: true },
    });
    const cajasPorReferido = new Map<string, number>();
    for (const c of cajasRaw) {
      cajasPorReferido.set(c.userId!, (cajasPorReferido.get(c.userId!) ?? 0) + 1);
    }

    // ── Gift cards DISPONIBLE de cada referidor ───────────────────────────
    const gcsRaw = await prisma.giftCard.findMany({
      where: { propietarioId: { in: referidorIds }, estado: "DISPONIBLE" },
      select: { propietarioId: true },
    });
    const gcPorReferidor = new Map<string, number>();
    for (const g of gcsRaw) {
      gcPorReferidor.set(g.propietarioId, (gcPorReferidor.get(g.propietarioId) ?? 0) + 1);
    }

    // ── Red de nivel 2: referidos de los referidos ────────────────────────
    const relNivel2 = await prisma.referido.findMany({
      where: { referidorId: { in: referidoIds } },
      select: { referidorId: true, referidoId: true, compro: true },
    });
    const nivel2PorReferidor = new Map<string, { total: number; activos: number; membresias: number }>();

    // referidoId de relaciones nivel1 → referidorId de nivel2
    const n2ByDirecto = new Map<string, typeof relNivel2>();
    for (const r of relNivel2) {
      const arr = n2ByDirecto.get(r.referidorId) ?? [];
      arr.push(r);
      n2ByDirecto.set(r.referidorId, arr);
    }

    // Ids de nivel 2
    const nivel2Ids = [...new Set(relNivel2.map((r) => r.referidoId))];
    const cajasN2 = await prisma.caja.findMany({
      where: { userId: { in: nivel2Ids }, estado: "VENDIDA" },
      select: { userId: true },
    });
    const cajasPorN2 = new Map<string, number>();
    for (const c of cajasN2) {
      cajasPorN2.set(c.userId!, (cajasPorN2.get(c.userId!) ?? 0) + 1);
    }

    // Agrupar nivel 2 por referidor directo (nivel 1)
    for (const [directoId, rels] of n2ByDirecto.entries()) {
      const stats = { total: rels.length, activos: rels.filter((r) => r.compro).length, membresias: 0 };
      for (const r of rels) stats.membresias += cajasPorN2.get(r.referidoId) ?? 0;
      n2ByDirecto; // unused warning suppression
      // We accumulate per original referidor (find who referred directoId)
      const refOrigen = relaciones.find((r) => r.referidoId === directoId);
      if (refOrigen) {
        const prev = nivel2PorReferidor.get(refOrigen.referidorId) ?? { total: 0, activos: 0, membresias: 0 };
        nivel2PorReferidor.set(refOrigen.referidorId, {
          total: prev.total + stats.total,
          activos: prev.activos + stats.activos,
          membresias: prev.membresias + stats.membresias,
        });
      }
    }

    // ── Construir resultado ───────────────────────────────────────────────
    const red = usuarios.map((u) => {
      const misRelaciones = relaciones.filter((r) => r.referidorId === u.id);
      const directos    = misRelaciones.length;
      const activos     = misRelaciones.filter((r) => r.compro).length;
      const membresiasRed = misRelaciones.reduce((sum, r) => sum + (cajasPorReferido.get(r.referidoId) ?? 0), 0);
      const giftCards   = gcPorReferidor.get(u.id) ?? 0;
      const n2          = nivel2PorReferidor.get(u.id) ?? { total: 0, activos: 0, membresias: 0 };
      const nivel        = calcularNivel(activos);

      const referidosList = misRelaciones.map((r) => {
        const info = refMap.get(r.referidoId);
        return {
          id: r.referidoId,
          nombre: info ? `${info.nombre} ${info.apellido}` : "–",
          correo: info?.correo ?? "–",
          compro: r.compro,
          membresias: cajasPorReferido.get(r.referidoId) ?? 0,
          subred: (n2ByDirecto.get(r.referidoId) ?? []).length,
        };
      }).sort((a, b) => Number(b.compro) - Number(a.compro));

      const proximoNivelIdx = NIVELES.findIndex((n) => n.nombre === nivel.nombre);
      const siguiente = proximoNivelIdx > 0 ? NIVELES[proximoNivelIdx - 1] : null;
      const faltanParaSiguiente = siguiente ? siguiente.min - activos : 0;

      return {
        id: u.id,
        nombre: `${u.nombre} ${u.apellido}`,
        correo: u.correo,
        fechaRegistro: u.fechaRegistro,
        nivel,
        directos,
        activos,
        membresiasRed,
        giftCards,
        nivel2: n2.total,
        activosNivel2: n2.activos,
        membresiasNivel2: n2.membresias,
        faltanParaSiguiente,
        siguienteNivel: siguiente,
        referidosList,
      };
    }).sort((a, b) => b.activos - a.activos || b.membresiasRed - a.membresiasRed);

    const resumen = {
      referidores: red.length,
      totalActivos: red.reduce((s, r) => s + r.activos, 0),
      totalMembresiasRed: red.reduce((s, r) => s + r.membresiasRed, 0),
      mayorRed: red[0]?.activos ?? 0,
    };

    return NextResponse.json({ red, resumen, niveles: NIVELES });
  } catch (error) {
    console.error("GET red-multinivel error:", error);
    return NextResponse.json({ mensaje: "Error interno." }, { status: 500 });
  }
}

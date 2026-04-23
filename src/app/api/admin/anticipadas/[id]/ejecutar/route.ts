import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  type AnticipadaRow = {
    id: string; nombre: string; premioDescripcion: string; premioValor: number | null;
    cantidadGanadores: number | bigint; soloVendidas: boolean; minCajas: number | bigint;
    estado: string;
  };
  const [anticipada] = await prisma.$queryRaw<AnticipadaRow[]>`
    SELECT id, nombre, "premioDescripcion", "premioValor",
           "cantidadGanadores", "soloVendidas", "minCajas", estado::text
    FROM sorteos_anticipados WHERE id = ${id} LIMIT 1
  `;
  if (!anticipada) {
    return NextResponse.json({ mensaje: "Selección no encontrada." }, { status: 404 });
  }
  if (anticipada.estado === "EJECUTADO") {
    return NextResponse.json(
      { mensaje: "Esta selección ya fue ejecutada." },
      { status: 409 }
    );
  }

  const minCajas = Number(anticipada.minCajas ?? 0);

  // Obtener usuarios elegibles según minCajas
  let usuariosElegiblesIds: Set<string> | null = null;
  if (minCajas > 0) {
    type URow = { userId: string };
    const ueRows = await prisma.$queryRaw<URow[]>`
      SELECT "userId" FROM cajas
      WHERE estado = 'VENDIDA' AND "userId" IS NOT NULL
      GROUP BY "userId"
      HAVING COUNT(*) >= ${minCajas}
    `;
    usuariosElegiblesIds = new Set(ueRows.map((r) => r.userId));
    if (usuariosElegiblesIds.size === 0) {
      return NextResponse.json(
        { mensaje: `No hay usuarios con ${minCajas}+ cajas compradas para esta selección.` },
        { status: 400 }
      );
    }
  }

  const cajas = await prisma.caja.findMany({
    where: anticipada.soloVendidas
      ? { estado: "VENDIDA", userId: { not: null } }
      : { estado: { in: ["VENDIDA", "RESERVADA"] }, userId: { not: null } },
    include: {
      user: { select: { id: true, nombre: true, apellido: true, correo: true } },
    },
  });

  // Filtrar por usuarios elegibles si aplica
  const cajasFiltradas = usuariosElegiblesIds
    ? cajas.filter((c) => c.userId && usuariosElegiblesIds!.has(c.userId))
    : cajas;

  if (cajasFiltradas.length === 0) {
    return NextResponse.json(
      { mensaje: "No hay cajas elegibles para ejecutar esta selección." },
      { status: 400 }
    );
  }

  // Mezclar aleatoriamente
  const mezcladas = [...cajasFiltradas].sort(() => Math.random() - 0.5);
  const cantidad = Math.min(Number(anticipada.cantidadGanadores), mezcladas.length);

  // Preferir usuarios únicos
  const seleccionados: typeof mezcladas = [];
  const usuariosYa = new Set<string>();

  for (const caja of mezcladas) {
    if (seleccionados.length >= cantidad) break;
    if (!usuariosYa.has(caja.userId!)) {
      seleccionados.push(caja);
      usuariosYa.add(caja.userId!);
    }
  }
  // Completar con cajas restantes si faltan
  if (seleccionados.length < cantidad) {
    for (const caja of mezcladas) {
      if (seleccionados.length >= cantidad) break;
      if (!seleccionados.includes(caja)) seleccionados.push(caja);
    }
  }

  const ganadores = seleccionados.map((c) => ({
    userId: c.userId!,
    nombre: c.user!.nombre,
    apellido: c.user!.apellido,
    correo: c.user!.correo,
    numeroCaja: c.numero,
  }));

  await prisma.$executeRaw`
    UPDATE sorteos_anticipados
    SET estado = 'EJECUTADO'::"EstadoAnticipada", ganadores = ${JSON.stringify(ganadores)}::jsonb
    WHERE id = ${id}
  `;

  // Enviar correos — fire and forget
  import("@/lib/email").then(({ enviarPremioAnticipado }) => {
    for (const g of ganadores) {
      enviarPremioAnticipado({
        correo: g.correo,
        nombre: g.nombre,
        nombreEvento: anticipada.nombre,
        premioDescripcion: anticipada.premioDescripcion,
        numeroCaja: g.numeroCaja,
      }).catch((err) => console.error("Email anticipada error:", err));
    }
  });

  return NextResponse.json({
    mensaje: "¡Selección ejecutada exitosamente!",
    ganadores,
  });
}

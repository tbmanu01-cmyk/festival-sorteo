type Tipo = "SISTEMA" | "SORTEO" | "RETIRO" | "PROMO" | "MEMBRESIA";

const ICONOS: Record<Tipo, string> = {
  SISTEMA:   "⚙️",
  SORTEO:    "🎲",
  RETIRO:    "💸",
  PROMO:     "📢",
  MEMBRESIA: "🎁",
};

interface OpcionesNotif {
  tipo: Tipo;
  titulo: string;
  cuerpo: string;
  icono?: string;
  usuarioId?: string;       // notificación personal
  paraAdmins?: boolean;     // broadcast a ADMIN/ASISTENTE
  paraUsuarios?: boolean;   // broadcast a todos los usuarios
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function crearNotificacion(prisma: any, opts: OpcionesNotif) {
  return prisma.notificacion.create({
    data: {
      tipo:         opts.tipo,
      titulo:       opts.titulo,
      cuerpo:       opts.cuerpo,
      icono:        opts.icono ?? ICONOS[opts.tipo],
      usuarioId:    opts.usuarioId ?? null,
      paraAdmins:   opts.paraAdmins ?? false,
      paraUsuarios: opts.paraUsuarios ?? false,
    },
  });
}

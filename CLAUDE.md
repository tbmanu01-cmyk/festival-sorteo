@AGENTS.md
# Cajas Sorpresa 10K — Estado del Proyecto

## Stack
- Next.js 14 + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL (Railway)
- NextAuth para autenticación
- Nodemailer para correos (Gmail SMTP)

## URL en producción
https://festival-sorteo.vercel.app

## Credenciales de prueba
- Admin: admin@festival.com / Admin123!
- Usuario: manuel@prueba.com

## Reglas importantes
- Todo el código en español
- Colores: azul #1B4F8A y dorado #F5A623
- Mobile-first
- No romper lo que ya funciona
- Imports dinámicos para Prisma y bcryptjs (evita bug Turbopack)

---

## MÓDULOS COMPLETADOS (verificado 3 mayo 2026)

### Público / Usuario
- ✅ Página de inicio: hero, cómo funciona, tabla de premios, próximas selecciones anticipadas
- ✅ Registro y login (NextAuth + JWT)
- ✅ Dashboard: reservas activas, cajas compradas, saldo, código de referido + QR descargable, mensaje motivacional si está cerca de 10 cajas
- ✅ Tienda de 10.000 cajas (0000-9999) con búsqueda, filtros y iconos 🎁
- ✅ Reservas con countdown de 15 minutos
- ✅ Compra simulada (billetera virtual en puntos)
- ✅ Ranking público /ranking: top 20 compradores, medallas top 3, badge 10+ cajas

### Sistema de referidos y fidelización
- ✅ Código de referido único por usuario
- ✅ Cupones automáticos: 1 caja gratis por cada 5 referidos que compren
- ✅ Modelos Referido y Cupon en BD

### Notificaciones por correo (Nodemailer)
- ✅ Comprobante de compra al confirmar pago
- ✅ Notificación de premio al ganar el sorteo principal
- ✅ Notificación de premio en selección anticipada
- ✅ Retiro aprobado (con monto y cuenta destino)
- ✅ Retiro rechazado (saldo devuelto)

### Panel Admin
- ✅ Dashboard admin /admin con estadísticas generales
- ✅ Gestión de usuarios /admin/usuarios (activar/desactivar, ver saldo y cajas)
- ✅ Gestión de retiros /admin/retiros (aprobar / rechazar con email automático)
- ✅ Cajas vendidas /admin/cajas-vendidas
- ✅ Configuración /admin/configuracion: precio por caja, distribución de premios (%), fecha del sorteo

### Motor de Sorteos unificado (/admin/motor-sorteos)
Panel con 4 tabs que centraliza todos los tipos de sorteo:
- ✅ **Tab Principal**: sorteo principal automático o manual + animación ruleta
- ✅ **Tab Anticipadas**: selecciones anticipadas (tipo rifa previa)
- ✅ **Tab Grandes**: Grandes Sorteos con premio mayor propio
- ✅ **Tab Previos**: Sorteos previos vinculados a un Gran Sorteo

### Grandes Sorteos (/admin/grandes-sorteos)
- ✅ CRUD completo (crear, editar, pausar, eliminar)
- ✅ Estados: PENDIENTE → ACTIVO → FINALIZADO
- ✅ Ejecución con animación ruleta y reveal del ganador
- ✅ Vista de detalle con modal

### Sorteos Previos (/admin/sorteos-previos)
- ✅ Vinculados a un Gran Sorteo específico
- ✅ Requisitos configurables: solo vendidas, min 10 cajas, solo este Gran Sorteo
- ✅ Múltiples ganadores por sorteo
- ✅ Animación ruleta con lista de ganadores al finalizar

### Selecciones Anticipadas (/admin/anticipadas)
- ✅ Tabla SorteoAnticipado en BD
- ✅ Premio en texto libre, cantidad de ganadores configurable
- ✅ Filtro: solo vendidas, exclusivo 10+ cajas
- ✅ Ejecución con selección aleatoria + email al ganador
- ✅ Próximas selecciones visibles en página de inicio

### Animación Ruleta (/components/RuletaSorteo.tsx)
- ✅ 4 slots (Millares, Centenas, Decenas, Unidades)
- ✅ Números girandose y frenando progresivamente de izquierda a derecha
- ✅ Shake + glow dorado al aterrizar cada dígito
- ✅ Confetti + reveal del número completo al terminar
- ✅ Integrada en: sorteo principal, Grandes Sorteos, Sorteos Previos, Motor unificado
- ✅ Botón "Ver demo" sin ejecutar sorteo real

### Reportes (/admin/reportes)
- ✅ Tab Ventas: tabla de todas las cajas vendidas con comprador, celular, ciudad, fecha
- ✅ Tab Sorteo: resumen financiero + tabla de ganadores por categoría
- ✅ Tab Usuarios: lista completa con datos bancarios, saldo, cajas y estado
- ✅ Exportar CSV (compatible Excel) en los 3 reportes
- ✅ Exportar PDF (ventana imprimible) en los 3 reportes

### Modelos en BD (Prisma)
User, Caja, Sorteo, Premio, Retiro, Transaccion, Config,
SorteoAnticipado, Referido, Cupon, GranSorteo, SorteoPrevioGran

---

## PENDIENTE

- **Integración Wompi** (pagos reales) — cuenta del socio en trámite
- **"Grabable para redes sociales"** — captura de video del overlay de animación (no implementado)
- Logo personalizado final (cuando esté diseñado)

---

## Lecciones importantes
- Vercel bloquea deploys en repos privados si detecta commits de usuarios que no son owner en plan Hobby → solución: eliminar y reimportar el proyecto
- Imports dinámicos para Prisma y bcryptjs son obligatorios para evitar bug con Turbopack

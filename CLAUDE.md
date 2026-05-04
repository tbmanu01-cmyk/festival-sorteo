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
- Siempre usar `npx prisma db push` (no migrations) para cambios de schema
- `useSearchParams` siempre dentro de `<Suspense>` para evitar error de build en Vercel

---

## MÓDULOS COMPLETADOS (verificado 4 mayo 2026)

### Público / Usuario
- ✅ Página de inicio: hero, cómo funciona, tabla de premios, próximas selecciones anticipadas
- ✅ Registro con toggle de visibilidad en campos de contraseña (ojito SVG)
- ✅ Login con toggle de visibilidad en campo de contraseña (ojito SVG)
- ✅ Recuperación de contraseña: `/recuperar-password` → correo con enlace → `/resetear-password?token=xxx` → nueva contraseña (token expira en 1 hora)
- ✅ Dashboard: reservas activas, cajas compradas, saldo, código de referido + QR descargable, mensaje motivacional si está cerca de 10 cajas
- ✅ Tienda de 10.000 cajas (0000-9999) con búsqueda, filtros y iconos 🎁
- ✅ Reservas con countdown de 15 minutos
- ✅ Compra simulada (billetera virtual en puntos)
- ✅ Ranking público /ranking: top 20 compradores, medallas top 3, badge 10+ cajas
- ✅ Todos los montos en COP sin decimales (`maximumFractionDigits: 0`)
- ✅ Precio de caja dinámico (se lee de Config, no hardcodeado)

### Sistema de referidos y gift cards
- ✅ Código de referido único por usuario
- ✅ Gift card automática por cada 5 referidos que compren su primera membresía (valor = precio actual de la membresía)
- ✅ Gift cards con 3 acciones: añadir a saldo, regalar a otro usuario (por correo), usar en compra de membresía
- ✅ En tienda: banner verde cuando hay gift card activa, descuento visible en modal de compra
- ✅ Selector/carrusel de gift cards en dashboard (compacto, un card a la vez con flechas y dots)
- ✅ Historial de gift cards usadas/regaladas (lista simple con badge de estado)
- ✅ Modelos Referido, Cupon (legacy) y GiftCard en BD

### Retiros
- ✅ Retiro mínimo: $100.000 COP
- ✅ Botón de retiro solo aparece cuando saldo ≥ $100.000

### Notificaciones por correo (Nodemailer)
- ✅ Comprobante de compra al confirmar pago
- ✅ Notificación de premio al ganar el sorteo principal
- ✅ Notificación de premio en selección anticipada
- ✅ Retiro aprobado (con monto y cuenta destino)
- ✅ Retiro rechazado (saldo devuelto)
- ✅ Recuperación de contraseña (enlace con token, válido 1 hora)

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
- ✅ Números girándose y frenando progresivamente de izquierda a derecha
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
SorteoAnticipado, Referido, Cupon, GiftCard, GranSorteo, SorteoPrevioGran

Campos agregados recientemente a User: `resetToken`, `resetTokenExpiry`

---

## PENDIENTE

- **Integración Wompi** (pagos reales) — cuenta del socio en trámite
- **"Grabable para redes sociales"** — captura de video del overlay de animación (no implementado)
- Logo personalizado final (cuando esté diseñado)

---

## Lecciones importantes
- Vercel bloquea deploys en repos privados si detecta commits de usuarios que no son owner en plan Hobby → solución: eliminar y reimportar el proyecto
- Imports dinámicos para Prisma y bcryptjs son obligatorios para evitar bug con Turbopack
- `className` en `CampoTexto`/componentes similares se aplica al `<input>`, no al wrapper — para col-span usar un `<div>` externo
- `Date.toLocaleString()` no acepta `maximumFractionDigits` — solo números usan esa opción
- `$transaction` con operaciones condicionales: usar spread `...(cond ? [op] : [])` en vez de array dinámico

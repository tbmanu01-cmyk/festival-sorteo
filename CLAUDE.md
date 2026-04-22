@AGENTS.md
# Festival Sorteo 10000 — Estado del Proyecto

## Stack
- Next.js 14 + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL (Railway)
- NextAuth para autenticación
- Nodemailer para correos

## Lo que está construido y funcionando
- Página de inicio con hero, cómo funciona y tabla de premios
- Registro y login de usuarios (NextAuth + JWT)
- Dashboard del usuario con reservas activas y cajas compradas
- Tienda con 10.000 cajas (0000-9999), búsqueda y filtros
- Reservas en tiempo real con countdown de 15 minutos
- Compra simulada (sin pasarela real aún)
- Billetera virtual con saldo en puntos
- Panel administrativo completo (/admin)
- Motor de sorteo automático y manual (/admin/sorteo)
- Distribución de premios por categoría sin acumulación

## Lo que falta por construir
- Reportes PDF y Excel (/admin/reportes) — EN PROGRESO
- Configuración editable (/admin/configuracion)
- Notificaciones por correo al comprar y al ganar
- Integración Wompi (pagos reales) — pendiente cuenta
- Deploy en Railway/Vercel

## Credenciales de prueba
- Admin: admin@festival.com / Admin123!
- Usuario: manuel@prueba.com / (la que creaste)

## Reglas importantes
- Todo el código en español
- Colores: azul #1B4F8A y dorado #F5A623
- Mobile-first
- No romper lo que ya funciona
- Imports dinámicos para Prisma y bcryptjs (evita bug Turbopack)
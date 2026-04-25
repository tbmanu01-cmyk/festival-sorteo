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

## Estado actual: COMPLETADO Y EN PRODUCCIÓN
## URL: https://festival-sorteo.vercel.app
## Pendiente: Integración Wompi (pagos reales)

## ACTUALIZACIÓN - 25 de abril 2026

### Deploy en producción
URL: https://festival-sorteo.vercel.app
Estado: ✅ Funcionando correctamente
Problema resuelto: eliminado y reimportado proyecto en Vercel 
por error de colaboración en repo privado

### Módulos completados hoy (Parte 1-5)
- ✅ Cambio global de lenguaje: "Festival Sorteo" → "Cajas Sorpresa 10K"
- ✅ Logo actualizado: "10K" en blanco + "Cajas Sorpresa" en dorado
- ✅ Iconos 🎁 grandes en tienda de cajas (80% del espacio)
- ✅ Sistema completo de selecciones anticipadas:
  * Tabla SorteoAnticipado en BD
  * Panel /admin/anticipadas para crear eventos
  * Premios editables (texto libre)
  * Ejecución con selección aleatoria de ganadores
  * Notificación por email
  * Próximas selecciones en página de inicio
- ✅ Sistema de referidos y fidelización:
  * Código de referido único por usuario
  * Link y QR descargable en dashboard
  * Cupones para cajas gratis (1 por cada 5 referidos que compren)
  * Tabla Referido y Cupon en BD
- ✅ Ranking público /ranking con top 20 compradores
  * Medallas para top 3
  * Badge especial para compradores de 10+ cajas
- ✅ Sorteo exclusivo para 10+ cajas (configurable en anticipadas)
- ✅ Mensaje motivacional en dashboard si está cerca de 10 cajas

### Pendientes
- **Parte 3 (URGENTE):** Animación ruleta/bombo para sorteo en vivo
  * 4 compartimientos (1 por cifra)
  * Números cayendo de arriba hacia abajo
  * Se detienen de izquierda a derecha con suspenso
  * Efecto dorado + confetti al final
  * Grabable para redes sociales
- Logo personalizado (cuando esté diseñado)
- Integración Wompi producción (cuenta en trámite con socio)

### Lecciones de hoy
- Vercel bloquea deploys en repos privados si detecta commits 
  de usuarios que no son owner del proyecto en plan Hobby
- Solución: eliminar proyecto y reimportarlo limpio
- Deploy automático funciona perfecto después de esto
- Consumo: ~2 USD en esta sesión, quedan ~$8 USD

### Próxima sesión
Continuar con Parte 3: animación del sorteo tipo bombo/ruleta
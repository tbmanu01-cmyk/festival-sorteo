import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const FAQS = [
  {
    categoria: "Membresías",
    pregunta: "¿Cómo compro una membresía?",
    palabrasClave: ["comprar", "membresia", "membresias", "pago", "adquirir"],
    respuesta:
      "Ve a la sección Membresías, elige un número disponible (o pide uno aleatorio con el botón de sorpresa) y sigue el flujo de pago con tarjeta/PSE, transferencia o saldo/gift card. Puedes reservarla por 15 minutos mientras completas el pago.",
    orden: 1,
  },
  {
    categoria: "Membresías",
    pregunta: "¿Cómo funciona la selección aleatoria?",
    palabrasClave: ["seleccion", "aleatoria", "sorteo", "ganador", "numero", "premio"],
    respuesta:
      "Cada membresía tiene un número de 4 cifras. En la selección aleatoria se elige un número ganador; entre más cifras coincidan con el tuyo (desde la última), mayor el premio. Puedes ver los resultados en tiempo real en la sección Ranking.",
    orden: 2,
  },
  {
    categoria: "Retiros",
    pregunta: "¿Cuál es el monto mínimo para retirar?",
    palabrasClave: ["retiro", "retirar", "minimo", "monto", "plata", "dinero"],
    respuesta:
      "El retiro mínimo es de $100.000 COP. Para poder retirar, tu cuenta debe estar confirmada — si no lo está, contacta a un asesor para que la validemos.",
    orden: 1,
  },
  {
    categoria: "Retiros",
    pregunta: "¿Cuánto tarda en procesarse un retiro?",
    palabrasClave: ["tiempo", "demora", "tarda", "procesar", "aprobar", "retiro"],
    respuesta:
      "Una vez solicitas el retiro, nuestro equipo lo revisa y aprueba manualmente. Recibirás un correo (y una notificación en la campana) tan pronto se apruebe o si necesitamos algo más de ti.",
    orden: 2,
  },
  {
    categoria: "Gift cards y referidos",
    pregunta: "¿Cómo consigo una gift card?",
    palabrasClave: ["gift", "card", "giftcard", "regalo", "referido", "referidos"],
    respuesta:
      "Ganas una gift card automáticamente cada 5 membresías compradas — ya sea por ti mismo o por las personas que invitaste con tu código de referido. La puedes usar en tu próxima membresía, convertirla en saldo o regalarla a otra persona.",
    orden: 1,
  },
  {
    categoria: "Gift cards y referidos",
    pregunta: "¿Dónde encuentro mi código de referido?",
    palabrasClave: ["codigo", "referido", "invitar", "link", "compartir"],
    respuesta:
      "Tu código y link de referido están en tu panel de Mi cuenta, junto con un QR que puedes compartir directamente.",
    orden: 2,
  },
  {
    categoria: "Mi cuenta",
    pregunta: "Olvidé mi contraseña, ¿qué hago?",
    palabrasClave: ["contraseña", "clave", "password", "recuperar", "olvide", "acceso"],
    respuesta:
      'Entra a la pantalla de inicio de sesión y haz clic en "¿Olvidaste tu contraseña?". Te enviaremos un enlace a tu correo, válido por 1 hora, para crear una nueva.',
    orden: 1,
  },
];

async function main() {
  console.log("🌱 Sembrando FAQs del chat de soporte...");
  for (const faq of FAQS) {
    const existente = await prisma.faqItem.findFirst({ where: { pregunta: faq.pregunta } });
    if (existente) {
      console.log(`↷ Ya existe: "${faq.pregunta}"`);
      continue;
    }
    await prisma.faqItem.create({ data: faq });
    console.log(`✓ Creada: "${faq.pregunta}"`);
  }
  console.log("✅ Listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

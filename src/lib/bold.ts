import crypto from "crypto";

// Botón de pagos Bold — https://developers.bold.co/pagos-en-linea/boton-de-pagos
// La firma de integridad se genera SIEMPRE en el servidor para no exponer la llave secreta.

export function generarFirmaBold(orderId: string, monto: number, moneda: string) {
  const secretKey = process.env.BOLD_SECRET_KEY;
  if (!secretKey) throw new Error("BOLD_SECRET_KEY no configurada.");
  const cadena = `${orderId}${monto}${moneda}${secretKey}`;
  return crypto.createHash("sha256").update(cadena).digest("hex");
}

// Valida el header x-bold-signature de un webhook de Bold.
// Bold: base64-encode del body crudo, luego HMAC-SHA256 con la llave secreta, en hex.
export function verificarFirmaWebhookBold(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;
  const secretKey = process.env.BOLD_SECRET_KEY ?? "";

  const encoded = Buffer.from(rawBody).toString("base64");
  const esperado = crypto.createHmac("sha256", secretKey).update(encoded).digest("hex");

  const bufEsperado = Buffer.from(esperado);
  const bufRecibido = Buffer.from(signatureHeader);
  if (bufEsperado.length !== bufRecibido.length) return false;
  return crypto.timingSafeEqual(bufEsperado, bufRecibido);
}

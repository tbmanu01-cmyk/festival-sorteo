import { NextRequest } from "next/server";
import { manejarWebhookBold } from "@/lib/boldWebhookHandler";

// Webhook de PRODUCCIÓN de Bold. Registrar en panel.bold.co/panel/integrations
// como https://<dominio>/api/webhooks/bold. Para el ambiente de pruebas de
// Bold (sección separada "Webhooks de prueba") usar /api/webhooks/bold-test.
export async function POST(req: NextRequest) {
  return manejarWebhookBold(req);
}

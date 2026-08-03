import { NextRequest } from "next/server";
import { manejarWebhookBold } from "@/lib/boldWebhookHandler";

// Webhook de PRUEBAS de Bold (sección "Webhooks de prueba" del panel — Bold
// exige una URL distinta a la de producción). Registrar en
// panel.bold.co/panel/integrations como https://<dominio>/api/webhooks/bold-test.
export async function POST(req: NextRequest) {
  return manejarWebhookBold(req);
}

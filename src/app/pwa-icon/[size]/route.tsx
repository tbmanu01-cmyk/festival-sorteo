import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  return NextResponse.redirect(new URL(`/api/pwa-icon?size=${size}`, req.url));
}

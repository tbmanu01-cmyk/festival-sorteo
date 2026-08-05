import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const val = process.env.EMAIL_FROM ?? "";
  return NextResponse.json({
    hasValue: Boolean(val),
    len: val.length,
    startsWithTienda: val.startsWith("Tienda 10K"),
    startsWithClub: val.startsWith("Club 10K"),
  });
}

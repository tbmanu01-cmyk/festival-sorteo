import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasApiKey: Boolean(process.env.BOLD_API_KEY),
    hasSecretKey: Boolean(process.env.BOLD_SECRET_KEY),
    apiKeyLen: process.env.BOLD_API_KEY?.length ?? 0,
    secretKeyLen: process.env.BOLD_SECRET_KEY?.length ?? 0,
    apiKeyPrefix: process.env.BOLD_API_KEY?.slice(0, 6) ?? null,
  });
}

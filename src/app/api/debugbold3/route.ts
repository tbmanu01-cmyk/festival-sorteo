import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hasApiKey: Boolean(process.env.BOLD_API_KEY),
    hasSecretKey: Boolean(process.env.BOLD_SECRET_KEY),
    apiKeyLen: process.env.BOLD_API_KEY?.length ?? 0,
    secretKeyLen: process.env.BOLD_SECRET_KEY?.length ?? 0,
    apiKeyPrefix: process.env.BOLD_API_KEY?.slice(0, 6) ?? null,
    region: process.env.VERCEL_REGION ?? null,
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    url: process.env.VERCEL_URL ?? null,
    now: new Date().toISOString(),
  });
}

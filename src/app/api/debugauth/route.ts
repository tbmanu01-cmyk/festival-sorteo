import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let tokenOk = false;
  let tokenError: string | null = null;
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    tokenOk = Boolean(token);
  } catch (e) {
    tokenError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json({
    hasSecret: Boolean(process.env.NEXTAUTH_SECRET),
    secretLen: process.env.NEXTAUTH_SECRET?.length ?? 0,
    hasUrl: Boolean(process.env.NEXTAUTH_URL),
    urlValue: process.env.NEXTAUTH_URL ?? null,
    region: process.env.VERCEL_REGION ?? null,
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    hasCookieHeader: Boolean(req.headers.get("cookie")),
    cookieNames: (req.headers.get("cookie") ?? "").split(";").map(c => c.trim().split("=")[0]).filter(Boolean),
    tokenDecoded: tokenOk,
    tokenError,
    now: new Date().toISOString(),
  });
}

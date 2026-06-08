import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const base  = process.env.NEXTAUTH_URL ?? "https://tienda10k.com";

  if (!token) return NextResponse.redirect(`${base}/login?verify=invalido`);

  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });

  if (!user)
    return NextResponse.redirect(`${base}/login?verify=invalido`);

  if (user.confirmado)
    return NextResponse.redirect(`${base}/dashboard?verify=ya-confirmado`);

  if (!user.verifyTokenExpiry || user.verifyTokenExpiry < new Date())
    return NextResponse.redirect(`${base}/login?verify=expirado`);

  await prisma.user.update({
    where: { id: user.id },
    data: { confirmado: true, verifyToken: null, verifyTokenExpiry: null },
  });

  return NextResponse.redirect(`${base}/dashboard?verify=ok`);
}

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: { size: string } }
) {
  const size = parseInt(params.size) || 192;
  const f = size * 0.3;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #102463 0%, #173592 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: size * 0.22,
        }}
      >
        <div
          style={{
            color: "#ffbd1f",
            fontSize: f,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          10K
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: f * 0.33,
            fontFamily: "system-ui, sans-serif",
            marginTop: size * 0.04,
            letterSpacing: "0.06em",
          }}
        >
          CLUB
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}

import { NextResponse } from "next/server";

function slugToTitle(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string[] }> }
) {
  const { asset } = await context.params;
  if (!asset || asset.length === 0) {
    return NextResponse.json({ error: "Missing asset path." }, { status: 400 });
  }

  if (asset[0] === "audio") {
    const file = asset[1] ?? "voiceover.mp3";
    return new Response(`Mock audio placeholder for ${file}`, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  const topic = slugToTitle(asset[0] ?? "youtube-topic");
  const scene = (asset[1] ?? "scene").replace(".svg", "");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#091a2f" />
      <stop offset="100%" stop-color="#1f3f56" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" />
  <circle cx="220" cy="140" r="220" fill="rgba(239,131,84,0.18)" />
  <circle cx="1080" cy="620" r="260" fill="rgba(63,136,197,0.22)" />
  <text x="80" y="300" fill="#f3f1eb" font-size="54" font-family="Arial, sans-serif">${topic}</text>
  <text x="80" y="380" fill="#d6d3ce" font-size="38" font-family="Arial, sans-serif">${scene}</text>
  <text x="80" y="640" fill="#a8b1be" font-size="24" font-family="Arial, sans-serif">Mock image preview route</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

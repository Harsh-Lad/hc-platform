import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const base = process.env.HC_API_BASE!;
  const key = process.env.HC_API_KEY!;

  const upstream = await fetch(`${base}/v1/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "stepaudio-2.5-tts",
      input: body.input,
      voice: body.voice || "wenrounvsheng",
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "inline",
    },
  });
}

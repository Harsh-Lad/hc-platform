import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const incoming = await req.formData();
  const base = process.env.HC_API_BASE!;
  const key = process.env.HC_API_KEY!;

  // Rebuild FormData for upstream to ensure clean multipart encoding
  const outgoing = new FormData();
  for (const [k, v] of incoming.entries()) {
    outgoing.append(k, v);
  }

  // Ensure model is set
  if (!outgoing.has("model")) {
    outgoing.append("model", "step-image-edit-2");
  }

  const upstream = await fetch(`${base}/v1/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: outgoing,
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, { status: upstream.status });
  }

  return Response.json(await upstream.json());
}

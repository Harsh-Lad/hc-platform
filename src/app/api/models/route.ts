export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.HC_API_BASE!;
  const key = process.env.HC_API_KEY!;

  const upstream = await fetch(`${base}/v1/models`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 0 },
  });

  if (!upstream.ok) {
    return new Response(await upstream.text(), { status: upstream.status });
  }

  return Response.json(await upstream.json());
}

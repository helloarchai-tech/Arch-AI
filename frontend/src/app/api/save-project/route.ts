import { NextResponse } from "next/server";

function resolveBackendApi(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const backendRaw =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "";

    if (!backendRaw) {
      return NextResponse.json(
        { saved: false, detail: "BACKEND_API_URL not configured" },
        { status: 500 },
      );
    }

    const endpoint = `${resolveBackendApi(backendRaw)}/project/save`;
    console.log(`[save-proxy] Forwarding to: ${endpoint}`);

    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    ["authorization", "x-api-key", "x-pinggy-no-screen", "x-pinggy-allow-origin"].forEach((h) => {
      const val = req.headers.get(h);
      if (val) forwardHeaders[h] = val;
    });

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    if (!upstream.ok) {
      console.error(`[save-proxy] Backend returned ${upstream.status}: ${text.slice(0, 300)}`);
    }

    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Gateway error";
    console.error("[save-proxy] Error:", detail);
    return NextResponse.json({ saved: false, detail }, { status: 502 });
  }
}

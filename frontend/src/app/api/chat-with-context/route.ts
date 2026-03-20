import { NextResponse } from "next/server";

function normalizeBackendApi(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const backendRaw = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "";
    if (!backendRaw) {
      return NextResponse.json(
        { detail: "Backend API URL is not configured on the frontend server." },
        { status: 500 },
      );
    }

    const endpoint = `${normalizeBackendApi(backendRaw)}/chat-with-context`;
    let lastError = "Gateway request failed";

    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const text = await upstream.text();
        const contentType = upstream.headers.get("content-type") || "application/json";
        return new Response(text, {
          status: upstream.status,
          headers: { "Content-Type": contentType },
        });
      } catch (err) {
        clearTimeout(timeout);
        lastError = err instanceof Error ? err.message : "Unknown gateway error";
      }
    }

    return NextResponse.json(
      { detail: `Gateway error while contacting backend: ${lastError}` },
      { status: 502 },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ detail }, { status: 400 });
  }
}

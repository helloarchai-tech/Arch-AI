import { NextResponse } from "next/server";

/**
 * Normalise a raw backend URL so it ends with /api.
 * Handles: trailing slashes, URLs that already end with /api, etc.
 */
function resolveBackendApi(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  // Already has /api suffix
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // BACKEND_API_URL is the server-side env var set in Vercel / .env.local
    // NEXT_PUBLIC_API_URL is the fallback (also readable server-side)
    const backendRaw =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "";

    if (!backendRaw) {
      console.error("[chat-proxy] No backend URL configured. Set BACKEND_API_URL in Vercel env vars.");
      return NextResponse.json(
        { detail: "Backend API URL is not configured on the server. Please set BACKEND_API_URL in your deployment environment variables." },
        { status: 500 },
      );
    }

    const endpoint = `${resolveBackendApi(backendRaw)}/chat-with-context`;
    console.log(`[chat-proxy] Forwarding to: ${endpoint}`);

    let lastError = "Gateway request failed";

    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000); // 55s — generous for LLM
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

        if (!upstream.ok) {
          console.error(`[chat-proxy] Backend returned ${upstream.status}: ${text.slice(0, 200)}`);
        }

        return new Response(text, {
          status: upstream.status,
          headers: { "Content-Type": contentType },
        });
      } catch (err) {
        clearTimeout(timeout);
        lastError = err instanceof Error ? err.message : "Unknown gateway error";
        console.error(`[chat-proxy] Attempt ${attempt + 1} failed: ${lastError}`);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800)); // brief pause before retry
      }
    }

    return NextResponse.json(
      { detail: `Gateway error: ${lastError}. Check that the backend is running and BACKEND_API_URL is set correctly.` },
      { status: 502 },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ detail }, { status: 400 });
  }
}

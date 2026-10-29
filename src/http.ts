const DEFAULT_API_VERSION = "2025-04-16";

export function squareBaseUrl(environment: string): string {
  return environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function corsHeaders(
  request: Request,
  allowedOrigins: string[],
): HeadersInit {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Api-Key, Idempotency-Key",
    "Access-Control-Max-Age": "86400",
  };

  if (
    origin &&
    (allowedOrigins.length === 0 || allowedOrigins.includes(origin))
  ) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}

export function jsonResponse(
  data: unknown,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...Object.fromEntries(new Headers(extraHeaders).entries()),
    },
  });
}

export function errorResponse(
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  return jsonResponse({ error: message }, status, extraHeaders);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function squareApiVersion(env: { SQUARE_API_VERSION?: string }): string {
  return env.SQUARE_API_VERSION?.trim() || DEFAULT_API_VERSION;
}

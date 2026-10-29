export type SquareEnv = {
  SQUARE_ACCESS_TOKEN: string;
  SQUARE_DEVICE_ID: string;
  SQUARE_LOCATION_ID: string;
  SQUARE_ENVIRONMENT: string;
  SQUARE_API_VERSION?: string;
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function getSquareEnv(): SquareEnv {
  const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN?.trim();
  const SQUARE_DEVICE_ID = process.env.SQUARE_DEVICE_ID?.trim();
  const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID?.trim();
  const SQUARE_ENVIRONMENT =
    process.env.SQUARE_ENVIRONMENT?.trim() || "sandbox";

  if (!SQUARE_ACCESS_TOKEN) {
    throw new HttpError(500, "SQUARE_ACCESS_TOKEN is not configured");
  }
  if (!SQUARE_DEVICE_ID) {
    throw new HttpError(500, "SQUARE_DEVICE_ID is not configured");
  }
  if (!SQUARE_LOCATION_ID) {
    throw new HttpError(500, "SQUARE_LOCATION_ID is not configured");
  }

  return {
    SQUARE_ACCESS_TOKEN,
    SQUARE_DEVICE_ID,
    SQUARE_LOCATION_ID,
    SQUARE_ENVIRONMENT,
    SQUARE_API_VERSION: process.env.SQUARE_API_VERSION?.trim(),
  };
}

export function assertApiKey(request: Request): void {
  const expected = process.env.API_KEY?.trim();
  if (!expected) return;
  const key = request.headers.get("X-Api-Key");
  if (!key || key !== expected) {
    throw new HttpError(401, "Unauthorized");
  }
}

export function squareBaseUrl(environment: string): string {
  return environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export function squareApiVersion(env: { SQUARE_API_VERSION?: string }): string {
  return env.SQUARE_API_VERSION?.trim() || "2025-04-16";
}

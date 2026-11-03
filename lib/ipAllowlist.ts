export function parseAllowedIps(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => normalizeIp(part))
    .filter((part) => part.length > 0);
}

export function normalizeIp(value: string): string {
  let ip = value.trim();
  if (!ip) return "";

  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end > 0) ip = ip.slice(1, end);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  if (ip.toLowerCase().startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  return ip.toLowerCase();
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const requestIp = (request as Request & { ip?: unknown }).ip;
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    forwarded?.split(",")[0],
    typeof requestIp === "string" ? requestIp : null,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const ip = normalizeIp(raw);
    if (ip) return ip;
  }

  return null;
}

export function isIpAllowed(request: Request): boolean {
  const allowed = parseAllowedIps(process.env.ALLOWED_IPS);
  if (allowed.length === 0) return true;
  const ip = getClientIp(request);
  if (!ip) return false;
  return allowed.includes(ip);
}

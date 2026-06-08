// Rate limiter en memoria por clave (userId o IP).
// En Vercel serverless cada instancia tiene su propio Map,
// lo que igual frena ataques por instancia y es suficiente para este escala.

type Entrada = { count: number; resetAt: number };
const store = new Map<string, Entrada>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

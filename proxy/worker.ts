// Quest66 için küçük CORS proxy'si. Tarayıcıdan sağlayıcıya doğrudan istek CORS'a takılırsa kullanılır.
// Anahtarı saklamaz ve kaydetmez; istemcinin Authorization başlığını olduğu gibi iletir.
// İzin listeleri, Worker'ın başkaları tarafından açık proxy olarak kullanılmasını önler.

export interface Env {
  /** Virgülle ayrılmış izinli site kökenleri, örn. https://kullanici.github.io */
  ALLOWED_ORIGINS?: string;
  /** Virgülle ayrılmış izinli sağlayıcı adresleri. İlki varsayılandır. */
  ALLOWED_UPSTREAMS?: string;
}

const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_UPSTREAM = 'https://api.deepseek.com';

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Upstream-Base',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function fail(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function handleRequest(request: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const origin = request.headers.get('Origin') ?? '';
  if (!list(env.ALLOWED_ORIGINS).includes(origin)) return fail(403, 'Bu köken izinli değil.');
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return fail(405, 'Yalnızca POST kabul edilir.', cors);
  if (new URL(request.url).pathname !== '/chat/completions') return fail(404, 'Bilinmeyen yol.', cors);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return fail(401, 'Authorization başlığı eksik.', cors);

  const allowedUpstreams = list(env.ALLOWED_UPSTREAMS);
  if (allowedUpstreams.length === 0) allowedUpstreams.push(DEFAULT_UPSTREAM);
  const requested = (request.headers.get('X-Upstream-Base') ?? allowedUpstreams[0]).trim().replace(/\/+$/, '');
  if (!allowedUpstreams.includes(requested)) return fail(400, 'Bu sağlayıcı adresi izinli değil.', cors);

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) return fail(413, 'İstek çok büyük.', cors);

  const upstream = await fetchImpl(`${requested}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', ...cors },
  });
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
};

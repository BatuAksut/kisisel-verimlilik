import { describe, expect, it, vi } from 'vitest';
import { handleRequest, type Env } from './worker';

const ORIGIN = 'https://kullanici.github.io';
const env: Env = { ALLOWED_ORIGINS: `${ORIGIN}, http://localhost:5173`, ALLOWED_UPSTREAMS: 'https://api.deepseek.com,https://diger.example/v1/' };

function request(options: { method?: string; path?: string; origin?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new Request(`https://proxy.workers.dev${options.path ?? '/chat/completions'}`, {
    method: options.method ?? 'POST',
    headers: { Origin: options.origin ?? ORIGIN, Authorization: 'Bearer anahtar', ...options.headers },
    body: options.method === 'OPTIONS' || options.method === 'GET' ? undefined : (options.body ?? '{}'),
  });
}

const okUpstream = () => vi.fn(async (..._args: Parameters<typeof fetch>) => new Response('{"ok":1}', { headers: { 'Content-Type': 'application/json' } }));

describe('proxy worker', () => {
  it('izinli kökenin ön uçuş isteğini onaylar', async () => {
    const response = await handleRequest(request({ method: 'OPTIONS' }), env, okUpstream());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Upstream-Base');
  });

  it('izinsiz kökeni reddeder', async () => {
    const upstream = okUpstream();
    const response = await handleRequest(request({ origin: 'https://kotu.example' }), env, upstream);
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('köken listesi boşsa her şeyi reddeder', async () => {
    const response = await handleRequest(request(), {}, okUpstream());
    expect(response.status).toBe(403);
  });

  it('varsayılan sağlayıcıya yalnızca gerekli başlıkları iletir', async () => {
    const upstream = okUpstream();
    const response = await handleRequest(request({ headers: { Cookie: 'gizli=1' }, body: '{"a":1}' }), env, upstream);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(await response.text()).toBe('{"ok":1}');

    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init?.headers).toEqual({ Authorization: 'Bearer anahtar', 'Content-Type': 'application/json' });
  });

  it('izinli başka sağlayıcıyı başlıktan seçer', async () => {
    const upstream = okUpstream();
    await handleRequest(request({ headers: { 'X-Upstream-Base': 'https://diger.example/v1' } }), env, upstream);
    expect(upstream.mock.calls[0][0]).toBe('https://diger.example/v1/chat/completions');
  });

  it('izin listesinde olmayan sağlayıcıyı reddeder', async () => {
    const upstream = okUpstream();
    const response = await handleRequest(request({ headers: { 'X-Upstream-Base': 'http://169.254.169.254' } }), env, upstream);
    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('başka yolları, yöntemleri ve anahtarsız istekleri reddeder', async () => {
    const upstream = okUpstream();
    expect((await handleRequest(request({ path: '/models' }), env, upstream)).status).toBe(404);
    expect((await handleRequest(request({ method: 'GET' }), env, upstream)).status).toBe(405);
    const noAuth = new Request('https://proxy.workers.dev/chat/completions', { method: 'POST', headers: { Origin: ORIGIN }, body: '{}' });
    expect((await handleRequest(noAuth, env, upstream)).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('çok büyük isteği reddeder', async () => {
    const upstream = okUpstream();
    const response = await handleRequest(request({ body: 'x'.repeat(1_000_001) }), env, upstream);
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('sağlayıcının hata kodunu aktarır', async () => {
    const upstream = vi.fn(async () => new Response('{}', { status: 401 }));
    const response = await handleRequest(request(), env, upstream);
    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });
});

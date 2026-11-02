import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AiError, chatJson, chatUrl, isAiConfigured, type AiConfig } from './client';

const config: AiConfig = { apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/', model: 'deepseek-chat', proxyUrl: '' };
const schema = z.object({ ok: z.boolean() });
const messages = [{ role: 'user' as const, content: 'json' }];

const reply = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

function fakeFetch(...responses: (Response | Error)[]) {
  const mock = vi.fn(async (..._args: Parameters<typeof fetch>) => {
    const next = responses.shift();
    if (!next) throw new Error('Beklenmeyen istek');
    if (next instanceof Error) throw next;
    return next;
  });
  return mock;
}

const bodyOf = (mock: ReturnType<typeof fakeFetch>, call: number) => JSON.parse(String(mock.mock.calls[call][1]?.body));
const errorOf = (promise: Promise<unknown>) => promise.then(() => null, (error: AiError) => error);

describe('adres ayarı', () => {
  it('proxy varsa ona, yoksa sağlayıcıya gider', () => {
    expect(chatUrl(config)).toBe('https://api.deepseek.com/chat/completions');
    expect(chatUrl({ ...config, proxyUrl: 'https://p.workers.dev/' })).toBe('https://p.workers.dev/chat/completions');
  });

  it('anahtar, adres ve model olmadan yapılandırılmış sayılmaz', () => {
    expect(isAiConfigured(config)).toBe(true);
    expect(isAiConfigured({ ...config, apiKey: '  ' })).toBe(false);
    expect(isAiConfigured({ ...config, model: '' })).toBe(false);
  });
});

const encoder = new TextEncoder();
const streamed = (body: ReadableStream<Uint8Array>) => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
const sseLine = (delta: object, finish: string | null = null) =>
  `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finish }] })}\n\n`;
function chunks(...parts: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(encoder.encode(part)));
      controller.close();
    },
  });
}

describe('akışlı yanıt', () => {
  it('parçaları birleştirir, satır ortasından bölünse de ilerleme bildirir', async () => {
    const whole = `: keep-alive\n\n${sseLine({ reasoning_content: 'düşünce' })}${sseLine({ content: '{"ok":' })}${sseLine({ content: 'true}' }, 'stop')}data: [DONE]\n\n`;
    const fetchImpl = fakeFetch(streamed(chunks(whole.slice(0, 40), whole.slice(40))));
    const progress: number[] = [];
    await expect(chatJson(config, messages, schema, { fetchImpl, onProgress: (chars) => progress.push(chars) })).resolves.toEqual({ ok: true });
    expect(progress).toEqual([6, 11]);
    expect(bodyOf(fetchImpl, 0).stream).toBe(true);
  });

  it('token sınırına takılan akışı geçersiz sayıp yeniden dener', async () => {
    const fetchImpl = fakeFetch(streamed(chunks(sseLine({ content: '{"ok":' }, 'length'))), reply('{"ok":true}'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('veri akışı durursa takılı kalmaz: bir kez yeniden dener, sonra hata verir', async () => {
    vi.useFakeTimers();
    try {
      const silent = () =>
        vi.fn(async (_url: unknown, init?: RequestInit) => {
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              init?.signal?.addEventListener('abort', () => controller.error(new Error('kesildi')));
            },
          });
          return streamed(body);
        });
      const fetchImpl = silent();
      const result = errorOf(chatJson(config, messages, schema, { fetchImpl: fetchImpl as unknown as typeof fetch }));
      await vi.advanceTimersByTimeAsync(121_000);
      expect(await result).toMatchObject({ kind: 'timeout' });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('iptal edilince yeniden denemez', async () => {
    const cancel = new AbortController();
    const fetchImpl = vi.fn(async () => {
      cancel.abort();
      throw new DOMException('Aborted', 'AbortError');
    });
    const error = await errorOf(chatJson(config, messages, schema, { fetchImpl: fetchImpl as unknown as typeof fetch, signal: cancel.signal }));
    expect(error).toMatchObject({ kind: 'aborted' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('düşünme modunu yalnızca DeepSeek için kapatır', async () => {
    const fetchImpl = fakeFetch(reply('{"ok":true}'), reply('{"ok":true}'));
    await chatJson(config, messages, schema, { fetchImpl });
    await chatJson({ ...config, baseUrl: 'https://baska.example/v1' }, messages, schema, { fetchImpl });
    expect(bodyOf(fetchImpl, 0).thinking).toEqual({ type: 'disabled' });
    expect(bodyOf(fetchImpl, 1).thinking).toBeUndefined();
  });
});

describe('chatJson', () => {
  it('JSON modunda ister ve doğrulanmış sonucu döndürür', async () => {
    const fetchImpl = fakeFetch(reply('{"ok":true}'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-key');
    expect(new Headers(init?.headers).has('X-Upstream-Base')).toBe(false);
    const body = bodyOf(fetchImpl, 0);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.model).toBe('deepseek-chat');
  });

  it('proxy kullanırken hedef sağlayıcıyı başlıkla bildirir', async () => {
    const fetchImpl = fakeFetch(reply('{"ok":true}'));
    await chatJson({ ...config, proxyUrl: 'https://p.workers.dev' }, messages, schema, { fetchImpl });
    expect(new Headers(fetchImpl.mock.calls[0][1]?.headers).get('X-Upstream-Base')).toBe('https://api.deepseek.com');
  });

  it('kod çitli JSON yu da okur', async () => {
    const fetchImpl = fakeFetch(reply('```json\n{"ok":true}\n```'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: true });
  });

  it('bozuk JSON da bir kez, hatayı bildirerek yeniden dener', async () => {
    const fetchImpl = fakeFetch(reply('bozuk'), reply('{"ok":true}'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchImpl, 1).messages.at(-1).content).toContain('geçersizdi');
  });

  it('şemaya uymayan yanıtta da yeniden dener', async () => {
    const fetchImpl = fakeFetch(reply('{"ok":"evet"}'), reply('{"ok":false}'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: false });
  });

  it('ikinci denemede de hatalıysa vazgeçer, üçüncü kez istemez', async () => {
    const fetchImpl = fakeFetch(reply('bozuk'), reply('yine bozuk'));
    const error = await errorOf(chatJson(config, messages, schema, { fetchImpl }));
    expect(error).toBeInstanceOf(AiError);
    expect(error?.kind).toBe('invalid');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('boş model yanıtını geçersiz sayar', async () => {
    const fetchImpl = fakeFetch(reply(''), reply('{"ok":true}'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: true });
  });

  it('anahtar reddedilirse yeniden denemez', async () => {
    const fetchImpl = fakeFetch(new Response('{}', { status: 401 }));
    const error = await errorOf(chatJson(config, messages, schema, { fetchImpl }));
    expect(error?.kind).toBe('auth');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reddedilen istekte sağlayıcının mesajını gösterir', async () => {
    const rejected = () => new Response(JSON.stringify({ error: { message: 'Model Not Exist' } }), { status: 400 });
    const fetchImpl = fakeFetch(rejected());
    const error = await errorOf(chatJson(config, messages, schema, { fetchImpl, maxTokens: 500 }));
    expect(error?.kind).toBe('request');
    expect(error?.message).toContain('Model adı');
    expect(error?.message).toContain('Model Not Exist');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('yüksek token sınırı reddedilirse bir kez düşük sınırla dener', async () => {
    const fetchImpl = fakeFetch(new Response('{}', { status: 400 }), reply('{"ok":true}'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: true });
    expect(bodyOf(fetchImpl, 0).max_tokens).toBe(24_000);
    expect(bodyOf(fetchImpl, 1).max_tokens).toBe(8_000);
  });

  it('token sınırına takılan yanıtı geçersiz sayıp yeniden dener', async () => {
    const cut = () =>
      new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{"ok":tr' } }] }));
    const fetchImpl = fakeFetch(cut(), reply('{"ok":true}'));
    await expect(chatJson(config, messages, schema, { fetchImpl })).resolves.toEqual({ ok: true });
    expect(bodyOf(fetchImpl, 1).messages.at(-1).content).toContain('yarıda kesildi');
  });

  it('ağ hatasında ve 5xx te bir kez yeniden dener', async () => {
    const network = fakeFetch(new TypeError('Failed to fetch'), reply('{"ok":true}'));
    await expect(chatJson(config, messages, schema, { fetchImpl: network })).resolves.toEqual({ ok: true });
    const server = fakeFetch(new Response('', { status: 503 }), new Response('', { status: 503 }));
    expect((await errorOf(chatJson(config, messages, schema, { fetchImpl: server })))?.kind).toBe('http');
    expect(server).toHaveBeenCalledTimes(2);
  });

  it('kullanıcı iptal edince yeniden denemez', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async () => {
      controller.abort();
      throw new DOMException('Aborted', 'AbortError');
    });
    const error = await errorOf(chatJson(config, messages, schema, { fetchImpl, signal: controller.signal }));
    expect(error?.kind).toBe('aborted');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('yapılandırma eksikse hiç istek atmaz', async () => {
    const fetchImpl = fakeFetch();
    const error = await errorOf(chatJson({ ...config, apiKey: '' }, messages, schema, { fetchImpl }));
    expect(error?.kind).toBe('config');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

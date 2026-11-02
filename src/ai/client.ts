import { z } from 'zod';
import type { AppSettings } from '../domain/types';

export type AiErrorKind = 'config' | 'auth' | 'request' | 'http' | 'network' | 'timeout' | 'aborted' | 'invalid';

export class AiError extends Error {
  constructor(
    public kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type AiConfig = Pick<AppSettings, 'apiKey' | 'baseUrl' | 'model' | 'proxyUrl'>;

export interface ChatOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
  /** Akış sırasında, o ana kadar gelen yanıtın karakter sayısıyla çağrılır. */
  onProgress?: (chars: number) => void;
}

const DEFAULT_TIMEOUT_MS = 150_000;
// Yanıt akarken bu kadar süre hiç veri gelmezse bağlantı kopmuş sayılır (örneğin ekran kilitlenince).
const IDLE_TIMEOUT_MS = 60_000;
// Düşünme modundaki modeller bütçenin büyük kısmını muhakemeye harcar. Bu kadar yüksek bir sınırı
// kabul etmeyen sağlayıcılar için istek bir kez düşük sınırla tekrarlanır.
const DEFAULT_MAX_TOKENS = 24_000;
const FALLBACK_MAX_TOKENS = 8_000;
const trimSlash = (url: string) => url.trim().replace(/\/+$/, '');
// Gerçek ölçüm (Kasım 2026, bir hafta): düşünme açıkken 83 sn, kapalıyken 25 sn.
const thinkingOff = (config: AiConfig) => (/deepseek\.com/i.test(config.baseUrl) ? { thinking: { type: 'disabled' } } : {});

export function isAiConfigured(config: AiConfig): boolean {
  return config.apiKey.trim() !== '' && config.baseUrl.trim() !== '' && config.model.trim() !== '';
}

export function chatUrl(config: AiConfig): string {
  return `${trimSlash(config.proxyUrl || config.baseUrl)}/chat/completions`;
}

function upstreamMessage(bodyText: string): string {
  try {
    const message = JSON.parse(bodyText)?.error?.message;
    return typeof message === 'string' ? message.slice(0, 200) : '';
  } catch {
    return '';
  }
}

interface Completion {
  content: unknown;
  finishReason: unknown;
}

/** Sunucunun `text/event-stream` yanıtını okur; her veri geldiğinde `onData` çağrılır. */
async function readStream(body: ReadableStream<Uint8Array>, onData: () => void, onProgress?: (chars: number) => void): Promise<Completion> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let finishReason: unknown;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onData();
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '' || data === '[DONE]') continue;
      let chunk;
      try {
        chunk = JSON.parse(data);
      } catch {
        throw new AiError('invalid', 'Sunucu akışı bozuk geldi.');
      }
      if (chunk?.error) throw new AiError('http', `Sunucu yanıtı yarıda kesti. ${upstreamMessage(data)}`.trim());
      const choice = chunk?.choices?.[0];
      if (typeof choice?.delta?.content === 'string') {
        content += choice.delta.content;
        onProgress?.(content.length);
      }
      finishReason = choice?.finish_reason ?? finishReason;
    }
  }
  return { content, finishReason };
}

async function requestOnce(config: AiConfig, messages: ChatMessage[], options: ChatOptions): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey.trim()}`,
  };
  // Proxy, hedef sağlayıcıyı bu başlıktan öğrenir ve kendi izin listesiyle karşılaştırır.
  if (config.proxyUrl.trim()) headers['X-Upstream-Base'] = trimSlash(config.baseUrl);

  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const idle = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const onData = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => idle.abort(), IDLE_TIMEOUT_MS);
  };
  onData();
  const signal = AbortSignal.any([timeout, idle.signal, ...(options.signal ? [options.signal] : [])]);

  let response: Response;
  let bodyText = '';
  let completion: Completion | undefined;
  try {
    response = await (options.fetchImpl ?? fetch)(chatUrl(config), {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: config.model.trim(),
        messages,
        response_format: { type: 'json_object' },
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: 0.8,
        stream: true,
        ...thinkingOff(config),
      }),
    });
    onData();
    // Akışı desteklemeyen sağlayıcı veya proxy düz JSON döndürebilir; ikisi de kabul edilir.
    const isStream = response.ok && response.body && response.headers.get('Content-Type')?.includes('text/event-stream');
    if (isStream) completion = await readStream(response.body!, onData, options.onProgress);
    else bodyText = await response.text();
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (options.signal?.aborted) throw new AiError('aborted', 'İstek iptal edildi.');
    if (timeout.aborted) throw new AiError('timeout', 'Sunucu zamanında yanıt vermedi.');
    if (idle.signal.aborted) throw new AiError('timeout', 'Sunucudan veri gelmeyi kesti. Bağlantı kopmuş olabilir.');
    throw new AiError(
      'network',
      `Sunucuya ulaşılamadı. İnternetini kontrol et; sorun sürerse CORS engeli olabilir, Proxy URL dene. (${String(error)})`,
    );
  } finally {
    clearTimeout(idleTimer);
  }

  if (response.status === 401 || response.status === 403) {
    throw new AiError('auth', `API anahtarı reddedildi (HTTP ${response.status}).`);
  }
  if (response.status === 402) throw new AiError('auth', 'Sağlayıcı hesabında yeterli bakiye yok (HTTP 402).');
  if ([400, 404, 422].includes(response.status)) {
    throw new AiError(
      'request',
      `Sağlayıcı isteği reddetti (HTTP ${response.status}). Model adı veya Base URL güncel olmayabilir, Ayarlar'dan kontrol et. ${upstreamMessage(bodyText)}`.trim(),
    );
  }
  if (!response.ok) throw new AiError('http', `Sunucu hata döndürdü (HTTP ${response.status}).`);

  if (!completion) {
    try {
      const choice = JSON.parse(bodyText)?.choices?.[0];
      completion = { content: choice?.message?.content, finishReason: choice?.finish_reason };
    } catch {
      throw new AiError('invalid', 'Sunucu yanıtı JSON değil.');
    }
  }
  const { content, finishReason } = completion;
  if (finishReason === 'length') throw new AiError('invalid', 'Model yanıtı token sınırına takılıp yarıda kesildi.');
  if (typeof content !== 'string' || content.trim() === '') {
    throw new AiError('invalid', 'Model boş yanıt döndürdü.');
  }
  return content;
}

function parseContent<T>(content: string, schema: z.ZodType<T>): T {
  // Bazı sağlayıcılar JSON modunda bile ```json çiti ekleyebiliyor.
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiError('invalid', 'Model yanıtı geçerli JSON değil.');
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new AiError('invalid', `Model yanıtı beklenen biçimde değil: ${issues}`);
  }
  return result.data;
}

/** Ayarlar ekranı için küçük bir deneme isteği atar; sorun varsa AiError fırlatır. */
export async function testConnection(config: AiConfig, options: ChatOptions = {}): Promise<void> {
  await chatJson(
    config,
    [{ role: 'user', content: 'Bu bir bağlantı testidir. Yalnızca şu JSON nesnesini döndür: {"ok": true}' }],
    z.object({ ok: z.boolean() }),
    { maxTokens: 500, timeoutMs: 30_000, ...options },
  );
}

const RETRYABLE: AiErrorKind[] = ['invalid', 'http', 'network', 'timeout'];

/** İsteği gönderir, JSON'u şemayla doğrular. Hatalı yanıtta bir kez, hatayı da bildirerek yeniden dener. */
export async function chatJson<T>(
  config: AiConfig,
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  options: ChatOptions = {},
): Promise<T> {
  if (!isAiConfigured(config)) throw new AiError('config', 'API anahtarı, adres veya model eksik.');

  let attemptMessages = messages;
  let maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  for (let attempt = 1; ; attempt++) {
    try {
      const content = await requestOnce(config, attemptMessages, { ...options, maxTokens });
      return parseContent(content, schema);
    } catch (error) {
      const aiError = error instanceof AiError ? error : new AiError('invalid', String(error));
      if (attempt < 2 && aiError.kind === 'request' && maxTokens > FALLBACK_MAX_TOKENS) {
        maxTokens = FALLBACK_MAX_TOKENS;
        continue;
      }
      if (attempt >= 2 || !RETRYABLE.includes(aiError.kind)) throw aiError;
      if (aiError.kind === 'invalid') {
        attemptMessages = [
          ...messages,
          { role: 'user', content: `Önceki yanıtın geçersizdi: ${aiError.message}. Kurallara uyan tam JSON'u yeniden üret.` },
        ];
      }
    }
  }
}

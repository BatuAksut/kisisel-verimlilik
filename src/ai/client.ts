import { z } from 'zod';
import type { AppSettings } from '../domain/types';

export type AiErrorKind = 'config' | 'offline' | 'auth' | 'http' | 'network' | 'timeout' | 'aborted' | 'invalid';

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
}

const DEFAULT_TIMEOUT_MS = 120_000;
const trimSlash = (url: string) => url.trim().replace(/\/+$/, '');

export function isAiConfigured(config: AiConfig): boolean {
  return config.apiKey.trim() !== '' && config.baseUrl.trim() !== '' && config.model.trim() !== '';
}

export function chatUrl(config: AiConfig): string {
  return `${trimSlash(config.proxyUrl || config.baseUrl)}/chat/completions`;
}

async function requestOnce(config: AiConfig, messages: ChatMessage[], options: ChatOptions): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey.trim()}`,
  };
  // Proxy, hedef sağlayıcıyı bu başlıktan öğrenir ve kendi izin listesiyle karşılaştırır.
  if (config.proxyUrl.trim()) headers['X-Upstream-Base'] = trimSlash(config.baseUrl);

  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let response: Response;
  let bodyText: string;
  try {
    response = await (options.fetchImpl ?? fetch)(chatUrl(config), {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: config.model.trim(),
        messages,
        response_format: { type: 'json_object' },
        max_tokens: options.maxTokens ?? 8000,
        temperature: 0.8,
        stream: false,
      }),
    });
    bodyText = await response.text();
  } catch (error) {
    if (options.signal?.aborted) throw new AiError('aborted', 'İstek iptal edildi.');
    if (timeout.aborted) throw new AiError('timeout', 'Sunucu zamanında yanıt vermedi.');
    throw new AiError(
      'network',
      `Sunucuya ulaşılamadı. İnternetini kontrol et; sorun sürerse CORS engeli olabilir, Proxy URL dene. (${String(error)})`,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AiError('auth', `API anahtarı reddedildi (HTTP ${response.status}).`);
  }
  if (response.status === 402) throw new AiError('auth', 'Sağlayıcı hesabında yeterli bakiye yok (HTTP 402).');
  if (!response.ok) throw new AiError('http', `Sunucu hata döndürdü (HTTP ${response.status}).`);

  let content: unknown;
  try {
    content = JSON.parse(bodyText)?.choices?.[0]?.message?.content;
  } catch {
    throw new AiError('invalid', 'Sunucu yanıtı JSON değil.');
  }
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
    { maxTokens: 30, timeoutMs: 30_000, ...options },
  );
}

const RETRYABLE: AiErrorKind[] = ['invalid', 'http', 'network'];

/** İsteği gönderir, JSON'u şemayla doğrular. Hatalı yanıtta bir kez, hatayı da bildirerek yeniden dener. */
export async function chatJson<T>(
  config: AiConfig,
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  options: ChatOptions = {},
): Promise<T> {
  if (!isAiConfigured(config)) throw new AiError('config', 'API anahtarı, adres veya model eksik.');

  let attemptMessages = messages;
  for (let attempt = 1; ; attempt++) {
    try {
      const content = await requestOnce(config, attemptMessages, options);
      return parseContent(content, schema);
    } catch (error) {
      const aiError = error instanceof AiError ? error : new AiError('invalid', String(error));
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

import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { AiError, testConnection } from '../../ai/client';
import { BackupError, createBackup, parseBackup, resetAll, restoreBackup } from '../../db/backup';
import { db, getSettings, saveSettings } from '../../db/database';
import { toDateKey } from '../../domain/dates';
import { DEFAULT_SETTINGS, DIFFICULTY_LABELS, type AppSettings, type Difficulty, type Profile } from '../../domain/types';
import { syncProgram, upgradePoolWeek } from '../../quests/sync';

type Notice = { tone: 'ok' | 'error' | 'info'; text: string } | null;

const NOTICE_COLORS = { ok: 'text-moss', error: 'text-rose', info: 'text-muted' };

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p role="status" className={`text-sm break-words ${NOTICE_COLORS[notice.tone]}`}>
      {notice.text}
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="panel pixel-frame space-y-3 p-3">
      <h2 className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function ApiSection({ settings }: { settings: AppSettings }) {
  const [form, setForm] = useState({
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.model,
    proxyUrl: settings.proxyUrl,
  });
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  function validate(): string | null {
    if (!validUrl(form.baseUrl.trim())) return 'Base URL https:// ile başlayan geçerli bir adres olmalı.';
    if (form.proxyUrl.trim() && !validUrl(form.proxyUrl.trim())) return 'Proxy URL https:// ile başlayan geçerli bir adres olmalı.';
    if (!form.model.trim()) return 'Model adı boş olamaz.';
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) return setNotice({ tone: 'error', text: problem });
    await saveSettings({
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      model: form.model.trim(),
      proxyUrl: form.proxyUrl.trim(),
    });
    setNotice({ tone: 'ok', text: 'Ayarlar kaydedildi.' });
    // Hafta havuzdan kurulmuşsa yeni anahtarla kalan günler arka planda yeniden üretilir.
    void upgradePoolWeek(new Date(), true).catch(console.error);
  }

  async function runTest() {
    const problem = validate();
    if (problem) return setNotice({ tone: 'error', text: problem });
    setBusy(true);
    setNotice({ tone: 'info', text: 'Bağlantı deneniyor...' });
    try {
      await testConnection(form);
      setNotice({ tone: 'ok', text: 'Bağlantı çalışıyor.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof AiError ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Yapay zekâ">
      <Field label="API anahtarı" hint="Yalnızca bu cihazda saklanır, sağlayıcı dışında hiçbir yere gönderilmez.">
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            className="field pixel-frame min-w-0 flex-1"
            placeholder="sk-..."
            value={form.apiKey}
            onChange={set('apiKey')}
          />
          <button type="button" className="shrink-0 px-1 text-sm text-ice" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Gizle' : 'Göster'}
          </button>
        </div>
      </Field>
      <Field label="Base URL">
        <input className="field pixel-frame" inputMode="url" spellCheck={false} value={form.baseUrl} onChange={set('baseUrl')} />
      </Field>
      <Field label="Model" hint="Test model hatası verirse sağlayıcının belgelerindeki güncel model adını yaz.">
        <input className="field pixel-frame" spellCheck={false} value={form.model} onChange={set('model')} />
      </Field>
      <Field label="Proxy URL (isteğe bağlı)" hint="Bağlantı testi CORS hatası verirse Cloudflare Worker adresini buraya yaz.">
        <input
          className="field pixel-frame"
          inputMode="url"
          spellCheck={false}
          placeholder="https://quest66-proxy.hesabin.workers.dev"
          value={form.proxyUrl}
          onChange={set('proxyUrl')}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="pixel-btn pixel-frame" onClick={save}>
          Kaydet
        </button>
        <button type="button" disabled={busy} className="pixel-btn pixel-btn-ghost pixel-frame" onClick={runTest}>
          Bağlantıyı test et
        </button>
      </div>
      <button
        type="button"
        className="text-sm text-ice"
        onClick={() =>
          setForm((current) => ({ ...current, baseUrl: DEFAULT_SETTINGS.baseUrl, model: DEFAULT_SETTINGS.model, proxyUrl: '' }))
        }
      >
        DeepSeek varsayılanlarına dön
      </button>
      <NoticeLine notice={notice} />
    </Section>
  );
}

function DifficultySection({ profile }: { profile: Profile }) {
  const options: Difficulty[] = ['kolay', 'normal', 'hard'];
  return (
    <Section title="Zorluk">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Zorluk seviyesi">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={profile.difficulty === option}
            onClick={() => void db.profile.update('me', { difficulty: option })}
            className={`min-h-11 border-2 font-pixel ${
              profile.difficulty === option ? 'border-amber bg-amber text-ink' : 'border-line bg-ink-soft'
            }`}
          >
            {DIFFICULTY_LABELS[option]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Seri eşiği ve Hard Mode cezası yarından, görev sayısı yeni haftanın görevleri üretilirken değişir.
      </p>
    </Section>
  );
}

function DataSection({ onRestored }: { onRestored: () => void }) {
  const [includeKey, setIncludeKey] = useState(false);
  const [keepApi, setKeepApi] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseBackup> | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function exportFile() {
    const backup = await createBackup(includeKey);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `quest66-yedek-${toDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: 'ok', text: 'Yedek dosyası indirildi.' });
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setPendingImport(parseBackup(await file.text()));
      setNotice(null);
    } catch (error) {
      setPendingImport(null);
      setNotice({ tone: 'error', text: error instanceof BackupError ? error.message : String(error) });
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    await restoreBackup(pendingImport);
    setPendingImport(null);
    setNotice({ tone: 'ok', text: 'Yedek geri yüklendi.' });
    onRestored();
    void syncProgram().catch(console.error);
  }

  async function confirmResetAll() {
    await resetAll(keepApi);
    window.location.hash = '#/';
  }

  return (
    <Section title="Veriler">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4 accent-amber" checked={includeKey} onChange={(event) => setIncludeKey(event.target.checked)} />
        <span>API anahtarını da yedeğe ekle. Dosyayı paylaşırsan anahtarın da açığa çıkar.</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="pixel-btn pixel-btn-ghost pixel-frame" onClick={exportFile}>
          Dışa aktar
        </button>
        <button type="button" className="pixel-btn pixel-btn-ghost pixel-frame" onClick={() => fileInput.current?.click()}>
          İçe aktar
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" aria-label="Yedek dosyası seç" className="hidden" onChange={chooseFile} />

      {pendingImport && (
        <div className="space-y-2 bg-ink-soft p-3 text-sm">
          <p>
            Bu yedek {pendingImport.profile.startDate.split('-').reverse().join('.')} tarihinde başlayan macerayı içeriyor.
            Cihazdaki tüm ilerlemenin yerini alacak.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="pixel-btn pixel-frame" onClick={confirmImport}>
              Geri yükle
            </button>
            <button type="button" className="pixel-btn pixel-btn-ghost pixel-frame" onClick={() => setPendingImport(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <NoticeLine notice={notice} />

      <div className="space-y-2 border-t-2 border-ink-soft pt-3">
        {!confirmReset ? (
          <button type="button" className="pixel-btn pixel-btn-danger pixel-frame w-[calc(100%-4px)]" onClick={() => setConfirmReset(true)}>
            Her şeyi sıfırla
          </button>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-rose">Tüm ilerlemen kalıcı olarak silinecek. Geri dönmek için önce dışa aktarabilirsin.</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-amber" checked={keepApi} onChange={(event) => setKeepApi(event.target.checked)} />
              API ayarlarını koru
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="pixel-btn pixel-btn-danger pixel-frame" onClick={confirmResetAll}>
                Evet, sil
              </button>
              <button type="button" className="pixel-btn pixel-btn-ghost pixel-frame" onClick={() => setConfirmReset(false)}>
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

export function SettingsScreen({ profile }: { profile: Profile }) {
  const settings = useLiveQuery(getSettings);
  const [formVersion, setFormVersion] = useState(0);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Ayarlar</h1>
      {/* Form okunan değerlerle bir kez kurulur; yalnızca yedek geri yüklenince yeniden başlatılır. */}
      {settings && <ApiSection key={formVersion} settings={settings} />}
      <DifficultySection profile={profile} />
      <DataSection onRestored={() => setFormVersion((version) => version + 1)} />
    </div>
  );
}

import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { db } from '../../db/database';
import type { Reflection } from '../../domain/types';

export const REFLECTION_START_HOUR = 17;
const MOODS = ['Çok kötü', 'Kötü', 'İdare eder', 'İyi', 'Harika'];

export function ReflectionCard({ todayNumber, saved }: { todayNumber: number; saved: Reflection | undefined }) {
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState<number | null>(saved?.mood ?? null);
  const [note, setNote] = useState(saved?.note ?? '');
  const isEvening = new Date().getHours() >= REFLECTION_START_HOUR;

  if (saved && !editing) {
    return (
      <section aria-label="Akşam yansıtması" className="panel pixel-frame flex items-start gap-3 p-3">
        <PixelIcon name="moon" size={20} className="mt-0.5 text-ice" />
        <div className="min-w-0 flex-1">
          <p className="font-pixel">Bugünkü ruh halin: {MOODS[saved.mood - 1]}</p>
          {saved.note && <p className="mt-0.5 text-sm break-words text-muted">{saved.note}</p>}
        </div>
        <button
          type="button"
          className="min-h-9 shrink-0 text-sm text-ice"
          onClick={() => {
            setMood(saved.mood);
            setNote(saved.note);
            setEditing(true);
          }}
        >
          Düzenle
        </button>
      </section>
    );
  }

  if (!isEvening && !saved) {
    return (
      <p className="flex items-center gap-2 px-1 text-sm text-muted">
        <PixelIcon name="moon" size={14} />
        Akşam yansıtması saat {REFLECTION_START_HOUR}:00’de açılır.
      </p>
    );
  }

  async function save() {
    if (mood === null) return;
    await db.reflections.put({ dayNumber: todayNumber, mood, note: note.trim(), createdAt: Date.now() });
    setEditing(false);
  }

  return (
    <section aria-label="Akşam yansıtması" className="panel pixel-frame space-y-3 p-3" style={{ '--frame': 'var(--color-ice)' } as React.CSSProperties}>
      <h2 className="flex items-center gap-2 text-lg">
        <PixelIcon name="moon" size={18} className="text-ice" />
        Bugün nasıl geçti?
      </h2>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Ruh hali">
        {MOODS.map((label, index) => {
          const value = index + 1;
          const selected = mood === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${value}: ${label}`}
              onClick={() => setMood(value)}
              className={`min-h-11 border-2 font-pixel text-lg ${
                selected ? 'border-ice bg-ice text-ink' : 'border-line bg-ink-soft'
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
      <p className="min-h-5 text-center text-sm text-muted">{mood ? MOODS[mood - 1] : '1 çok kötü, 5 harika'}</p>
      <input
        className="field pixel-frame"
        maxLength={140}
        placeholder="Tek satırlık not (isteğe bağlı)"
        aria-label="Tek satırlık not"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button type="button" disabled={mood === null} className="pixel-btn pixel-frame w-[calc(100%-4px)]" onClick={save}>
        Kaydet
      </button>
    </section>
  );
}

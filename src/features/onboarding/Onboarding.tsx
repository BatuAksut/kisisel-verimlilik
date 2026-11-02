import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { Scene } from '../../components/Scene';
import { HeroSprite, MonsterSprite } from '../../components/Sprite';
import { db, saveSettings } from '../../db/database';
import { addDays, toDateKey } from '../../domain/dates';
import { DIFFICULTY_LABELS } from '../../domain/types';
import { BOSSES, timeOfDay } from '../../domain/world';
import { isQuestionAnswered, QUESTIONS, toAnswers, type AnswerValues, type Question } from './questions';

function initialValues(): AnswerValues {
  const values: AnswerValues = {};
  for (const question of QUESTIONS) {
    if (question.kind === 'time') values[question.id] = question.initial;
  }
  return values;
}

function OptionButton({
  selected,
  label,
  hint,
  onClick,
}: {
  selected: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={selected ? { '--frame': 'var(--color-amber)' } as React.CSSProperties : undefined}
      className={`pixel-frame m-0.5 w-[calc(100%-4px)] px-3 py-3 text-left ${selected ? 'bg-panel-high' : 'bg-panel'}`}
    >
      <span className="flex items-center gap-2">
        <span className={selected ? 'text-amber' : 'text-line'}>
          <PixelIcon name={selected ? 'check' : 'cross'} size={14} className={selected ? '' : 'opacity-0'} />
        </span>
        <span>{label}</span>
      </span>
      {hint && <span className="mt-1 block pl-[22px] text-sm text-muted">{hint}</span>}
    </button>
  );
}

function QuestionBody({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  switch (question.kind) {
    case 'single':
      return (
        <div className="space-y-2.5">
          {question.options.map((option) => (
            <OptionButton
              key={option.value}
              selected={value === option.value}
              label={option.label}
              hint={option.hint}
              onClick={() => onChange(option.value)}
            />
          ))}
        </div>
      );
    case 'multi': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5">
          {question.options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <OptionButton
                key={option.value}
                selected={isSelected}
                label={option.label}
                onClick={() => {
                  if (isSelected) onChange(selected.filter((item) => item !== option.value));
                  else if (selected.length < question.max) onChange([...selected, option.value]);
                }}
              />
            );
          })}
        </div>
      );
    }
    case 'time':
      return (
        <input
          type="time"
          aria-label={question.title}
          className="field pixel-frame font-pixel text-2xl"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'text':
      return (
        <textarea
          aria-label={question.title}
          className="field pixel-frame"
          rows={3}
          maxLength={200}
          placeholder={question.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

function FinalStep({ values, onBack }: { values: AnswerValues; onBack: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const { answers, difficulty } = toAnswers(values);

  async function start(offset: number) {
    setSaving(true);
    const startDate = addDays(toDateKey(new Date()), offset);
    if (apiKey.trim()) await saveSettings({ apiKey: apiKey.trim() });
    await db.profile.put({ id: 'me', answers, difficulty, startDate, createdAt: Date.now() });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl text-amber">Macera hazır</h1>
      <div className="panel pixel-frame space-y-1 p-3 text-sm">
        <p>
          <span className="text-muted">Zorluk:</span> {DIFFICULTY_LABELS[difficulty]}
        </p>
        <p>
          <span className="text-muted">Hedefler:</span> {answers.goals.join(', ')}
        </p>
        <p>
          <span className="text-muted">Ritim:</span> {answers.wakeTime} uyanış, {answers.sleepTime} uyku
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="font-pixel text-lg">DeepSeek API anahtarı (isteğe bağlı)</span>
        <input
          type="password"
          autoComplete="off"
          className="field pixel-frame"
          placeholder="sk-..."
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <span className="block text-sm text-muted">
          Yalnızca bu cihazda saklanır. Girmezsen görevler hazır havuzdan gelir, sonra Ayarlar’dan ekleyebilirsin.
        </span>
      </label>

      <div className="space-y-2.5">
        <button type="button" disabled={saving} className="pixel-btn pixel-frame w-[calc(100%-4px)]" onClick={() => start(0)}>
          Bugün başla
        </button>
        <button
          type="button"
          disabled={saving}
          className="pixel-btn pixel-btn-ghost pixel-frame w-[calc(100%-4px)]"
          onClick={() => start(1)}
        >
          Yarın başla
        </button>
        <button type="button" disabled={saving} className="w-full py-2 text-sm text-muted" onClick={onBack}>
          Geri dön
        </button>
      </div>
    </div>
  );
}

export function Onboarding() {
  const [step, setStep] = useState(-1);
  const [values, setValues] = useState<AnswerValues>(initialValues);

  if (step === -1) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="scene-bleed">
          <Scene phase="temel" time={timeOfDay(new Date().getHours())} journey={0} tier={0} tintStatusBar />
        </div>
        <h1 className="text-outline -mt-6 text-6xl leading-none text-amber">Quest66</h1>
        <p className="text-lg">
          Bir alışkanlığın oturması zaman ister. 66 gün boyunca görevleri tamamla, XP topla, her hafta bir Boss’la yüzleş.
        </p>
        <section aria-label="Yoldaki Bosslar" className="boss-panel pixel-frame space-y-2 p-3">
          <p className="font-pixel text-lg text-rose">Yolda {BOSSES.length} Boss seni bekliyor</p>
          <div className="flex items-end justify-between">
            {BOSSES.slice(0, 5).map((boss) => (
              <MonsterSprite key={boss.name} boss={boss} scale={3} />
            ))}
          </div>
          <p className="text-xs text-muted">İlki: {BOSSES[0].name}. {BOSSES[0].quote}</p>
        </section>
        <p className="text-muted">Sana uygun bir macera kurmak için 15 kısa soru soracağım.</p>
        <button type="button" className="pixel-btn pixel-frame mt-auto" onClick={() => setStep(0)}>
          Maceraya başla
        </button>
      </div>
    );
  }

  if (step >= QUESTIONS.length) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
        <FinalStep values={values} onBack={() => setStep(QUESTIONS.length - 1)} />
      </div>
    );
  }

  const question = QUESTIONS[step];
  const value = values[question.id];
  const canContinue = isQuestionAnswered(question, value);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <div className="mb-6">
        <p className="mb-1.5 font-pixel text-muted">
          Soru {step + 1} / {QUESTIONS.length}
        </p>
        <div className="relative h-8" aria-hidden="true">
          <span className="absolute bottom-0 -translate-x-1/2" style={{ left: `${((step + 1) / QUESTIONS.length) * 92 + 4}%` }}>
            <HeroSprite tier={0} scale={2} className="block" />
          </span>
        </div>
        <div className="h-2 bg-panel" role="presentation">
          <div className="h-full bg-amber" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>

      <h1 className="mb-1.5 text-2xl leading-tight">{question.title}</h1>
      {question.hint && <p className="mb-1.5 text-sm text-muted">{question.hint}</p>}

      <div className="mt-3 flex-1">
        <QuestionBody
          question={question}
          value={value}
          onChange={(next) => setValues((current) => ({ ...current, [question.id]: next }))}
        />
      </div>

      <div className="sticky bottom-0 mt-6 grid grid-cols-[auto_1fr] gap-3 bg-ink py-3">
        <button type="button" className="pixel-btn pixel-btn-ghost pixel-frame" onClick={() => setStep(step - 1)}>
          Geri
        </button>
        <button
          type="button"
          disabled={!canContinue}
          className="pixel-btn pixel-frame"
          onClick={() => setStep(step + 1)}
        >
          Devam
        </button>
      </div>
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'wouter';
import { setSoundEnabled } from '../../audio/sfx';
import { PixelIcon } from '../../components/PixelIcon';
import { Scene } from '../../components/Scene';
import { db, getSettings } from '../../db/database';
import { phaseOfDay, TOTAL_DAYS, weekOfDay } from '../../domain/program';
import { heroTier, SUCCESS_THRESHOLD } from '../../domain/progress';
import type { Profile, Quest, WeekRecord } from '../../domain/types';
import { bossOfWeek, daysUntilBoss, LOCATIONS, narratorLine, timeOfDay, type BossState } from '../../domain/world';
import { remindPendingQuests } from '../../notifications/notifications';
import { rerollSideQuest, toggleQuest } from '../../quests/actions';
import { syncStatus, upgradePoolWeek } from '../../quests/sync';
import { useProgress } from '../useProgram';
import { BossEncounter, BossTeaser } from './BossCard';
import { Celebration, useCelebrations } from './Celebration';
import { DayIntro } from './DayIntro';
import { HeroBar, YesterdayNotice } from './HeroBar';
import { InstallPrompt } from './InstallPrompt';
import { NotificationPrompt } from './NotificationPrompt';
import { QuestCard } from './QuestCard';
import { ReflectionCard } from './ReflectionCard';

function AiBanner() {
  return (
    <p role="status" className="flex items-start gap-2 bg-panel-high px-3 py-2 text-sm">
      <PixelIcon name="star" size={16} className="mt-0.5 animate-pulse text-orchid" />
      <span>
        Yapay zekâ sana özel görevleri hazırlıyor, bu 1-2 dakika sürebilir. O zamana kadar bu görevlerle başlayabilirsin.
        Birini işaretlersen bugün bunlarla devam edersin, yenileri yarından gelir.
      </span>
    </p>
  );
}

function RunAiButton({ label }: { label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className="min-h-9 font-pixel text-sm text-ice"
        onClick={() => {
          setFailed(false);
          void upgradePoolWeek(new Date(), true).then((done) => setFailed(!done), console.error);
        }}
      >
        {label}
      </button>
      {failed && <p>Şu an üretilemedi. İnternet yoksa ya da bu hafta yenilenecek gün kalmadıysa bu normal.</p>}
    </>
  );
}

/** Görevleri kimin yazdığını açıkça söyler: yapay zekâ çalışıyor mu sorusu tahmine kalmasın. */
function AiStatus({ week, hasKey, todayFromAi }: { week?: WeekRecord; hasKey: boolean; todayFromAi: boolean }) {
  if (!week) return null;
  if (week.source === 'ai') {
    return (
      <p role="status" className="flex items-start gap-2 bg-ink-soft px-3 py-2 text-xs text-muted">
        <PixelIcon name="gem" size={14} className="shrink-0 text-ice" />
        {todayFromAi
          ? 'Bu haftanın görevlerini yapay zekâ senin için yazdı.'
          : 'Bugüne başladığın için bugünkü görevler hazır havuzdan. Yarından itibaren yapay zekâ yazdı.'}
      </p>
    );
  }
  if (week.lastError) {
    return (
      <div role="status" className="space-y-1 bg-ink-soft px-3 py-2 text-xs text-muted">
        <p>
          <span className="text-rose">Yapay zekâya ulaşılamadı,</span> görevler hazır havuzdan geldi.{' '}
          <span className="break-words">({week.lastError})</span>
        </p>
        <RunAiButton label="Yeniden dene" />
      </div>
    );
  }
  if (!hasKey) {
    return (
      <p className="bg-ink-soft px-3 py-2 text-xs text-muted">
        Görevler hazır havuzdan geliyor.{' '}
        <Link href="/ayarlar" className="text-ice underline">
          API anahtarı ekleyerek
        </Link>{' '}
        sana özel görevler alabilirsin.
      </p>
    );
  }
  return (
    <div className="space-y-1 bg-ink-soft px-3 py-2 text-xs text-muted">
      <p>Anahtarın kayıtlı ama görevler şu an hazır havuzdan. Yapay zekâ bu haftayı henüz yazmadı.</p>
      <RunAiButton label="Yapay zekâyla üret" />
    </div>
  );
}

function StatusBanner({ mains, threshold }: { mains: Quest[]; threshold: number }) {
  const done = mains.filter((quest) => quest.status === 'done').length;
  const needed = Math.ceil(threshold * mains.length);
  const won = done >= needed;
  return (
    <div className={`flex items-center justify-between gap-3 bg-panel-high px-3 py-2 text-sm ${won ? 'text-moss' : ''}`}>
      <p role="status" className="flex min-w-0 items-center gap-2">
        <PixelIcon name={won ? 'check' : 'flame'} size={16} className={won ? '' : 'text-amber'} />
        {won ? 'Günü kazandın, serin güvende.' : `Seriyi korumak için ${needed - done} ana görev daha.`}
      </p>
      <span aria-hidden="true" className="flex shrink-0 gap-0.5">
        {mains.map((quest, index) => (
          <PixelIcon
            key={quest.id}
            name="shield"
            size={12}
            className={index < done ? 'text-moss' : index < needed ? 'text-line' : 'text-ink-soft'}
          />
        ))}
      </span>
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="inline-flex items-center gap-2 text-xl">{children}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

function Narrator({ text }: { text: string }) {
  return (
    <p key={text} className="dialog-box animate-rise px-3 py-2.5 text-sm leading-snug">
      {text}
    </p>
  );
}

export function TodayScreen({ profile, todayNumber }: { profile: Profile; todayNumber: number }) {
  const generating = useSyncExternalStore(syncStatus.subscribe, syncStatus.isGenerating);
  const data = useLiveQuery(async () => {
    const [quests, day, week, reflection, settings] = await Promise.all([
      db.quests.where('dayNumber').equals(todayNumber).sortBy('order'),
      db.days.get(todayNumber),
      db.weeks.get(weekOfDay(todayNumber)),
      db.reflections.get(todayNumber),
      getSettings(),
    ]);
    return { quests, day, week, reflection, settings };
  }, [todayNumber]);

  const pendingCount = data?.quests.filter((quest) => quest.status === 'pending' && quest.type !== 'side').length ?? 0;
  const hasQuests = (data?.quests.length ?? 0) > 0;

  useEffect(() => {
    if (hasQuests) void remindPendingQuests(pendingCount).catch(console.error);
    // Yalnızca gün değişince veya görevler ilk yüklendiğinde hatırlatır, her işaretlemede değil.
  }, [hasQuests, todayNumber]);

  const progress = useProgress(todayNumber);
  const celebration = useCelebrations(progress, data?.quests, todayNumber);
  const soundEnabled = data?.settings.soundEnabled !== false;
  useEffect(() => setSoundEnabled(soundEnabled), [soundEnabled]);

  const handleToggle = useCallback((quest: Quest) => void toggleQuest(quest.id, todayNumber), [todayNumber]);
  const handleReroll = useCallback((quest: Quest) => void rerollSideQuest(quest.id, todayNumber), [todayNumber]);

  const time = timeOfDay(new Date().getHours());

  if (todayNumber < 1) {
    return (
      <div className="space-y-4 text-center">
        <div className="scene-bleed">
          <Scene phase="temel" time={time} journey={0} tier={0} tintStatusBar />
        </div>
        <h1 className="text-3xl">Macera yarın başlıyor</h1>
        <p className="text-muted">İlk görevlerin {profile.startDate.split('-').reverse().join('.')} günü burada olacak. İyi dinlen.</p>
      </div>
    );
  }

  if (todayNumber > TOTAL_DAYS) {
    return (
      <div className="space-y-4 text-center">
        <div className="scene-bleed">
          <Scene phase="ustalik" time={time} journey={1} tier={progress ? heroTier(progress.level) : 4} won tintStatusBar />
        </div>
        <h1 className="text-4xl text-amber">66 gün tamam!</h1>
        <p>Bu macerayı bitirdin. Yolculuğunu Profil ekranında görebilirsin.</p>
        <p className="text-sm text-muted">Yeni bir macera için Ayarlar’dan sıfırlama yapabilirsin.</p>
        <Link href="/profil" className="pixel-btn pixel-frame inline-block">
          Profili aç
        </Link>
      </div>
    );
  }

  if (!data) return null;
  const { quests, day, week, reflection, settings } = data;
  const mains = quests.filter((quest) => quest.type === 'main');
  const sides = quests.filter((quest) => quest.type === 'side');
  const boss = quests.find((quest) => quest.type === 'boss');
  const phase = phaseOfDay(todayNumber);
  const weekNumber = weekOfDay(todayNumber);
  const weekBoss = bossOfWeek(weekNumber);
  const bossState: BossState = !boss ? 'none' : boss.status === 'done' ? 'defeated' : 'pending';
  const won = progress?.outcomes[todayNumber] === 'success';
  const todayXp = quests.reduce((sum, quest) => sum + (quest.status === 'done' ? quest.xp : 0), 0);
  const bossIn = daysUntilBoss(todayNumber);

  return (
    <div className="space-y-5">
      <DayIntro day={todayNumber} />
      {celebration && <Celebration event={celebration} />}
      <div>
        <div className="scene-bleed">
          <Scene
            phase={phase.key}
            time={time}
            journey={(todayNumber - phase.firstDay) / (phase.lastDay - phase.firstDay)}
            tier={progress ? heroTier(progress.level) : 0}
            boss={bossState === 'pending' ? weekBoss : undefined}
            won={won}
            seed={phase.firstDay}
            tintStatusBar
          />
        </div>
        <header className="relative -mt-3">
          <h1 className="text-outline text-4xl leading-none">
            Gün <span className="text-amber">{todayNumber}</span> / {TOTAL_DAYS}
          </h1>
          <p className="mt-1 font-pixel text-sm text-muted">
            {LOCATIONS[phase.key]} · {phase.name} evresi · {weekNumber}. hafta{week ? `: ${week.theme}` : ''}
          </p>
        </header>
      </div>

      <Narrator text={narratorLine(todayNumber, { won, boss: bossState, time })} />

      {progress && <HeroBar progress={progress} todayXp={todayXp} />}
      {progress && <YesterdayNotice progress={progress} todayNumber={todayNumber} />}

      <InstallPrompt dismissed={Boolean(settings.installPromptDismissed)} />

      {quests.length > 0 && (
        <>
          {generating ? (
            <AiBanner />
          ) : (
            <AiStatus week={week} hasKey={settings.apiKey.trim() !== ''} todayFromAi={quests.some((quest) => quest.source === 'ai')} />
          )}
          <StatusBanner mains={mains} threshold={SUCCESS_THRESHOLD[day?.difficulty ?? profile.difficulty]} />
          <NotificationPrompt
            dismissed={Boolean(settings.notificationPromptDismissed)}
            onGranted={() => void remindPendingQuests(pendingCount).catch(console.error)}
          />

          {boss && <BossEncounter boss={weekBoss} quest={boss} onToggle={handleToggle} />}

          <section className="space-y-2.5" aria-label="Ana görevler">
            <SectionTitle hint={`${mains.filter((quest) => quest.status === 'done').length} / ${mains.length}`}>
              <PixelIcon name="sword" size={18} className="text-amber" />
              Ana görevler
            </SectionTitle>
            {mains.map((quest, index) => (
              <QuestCard key={quest.id} quest={quest} onToggle={handleToggle} index={index} />
            ))}
          </section>

          <section className="space-y-2.5" aria-label="Yan görevler">
            <SectionTitle hint="Seriyi etkilemez">
              <PixelIcon name="star" size={18} className="text-orchid" />
              Yan görevler
            </SectionTitle>
            {sides.map((quest, index) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onToggle={handleToggle}
                onReroll={handleReroll}
                rerollUsed={day?.rerollUsed}
                index={index}
              />
            ))}
          </section>

          {!boss && bossIn > 0 && <BossTeaser boss={weekBoss} days={bossIn} />}

          <ReflectionCard key={`${todayNumber}-${reflection?.createdAt ?? 0}`} todayNumber={todayNumber} saved={reflection} />
        </>
      )}
    </div>
  );
}

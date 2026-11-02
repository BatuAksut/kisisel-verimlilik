import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Link } from 'wouter';
import { PixelIcon } from '../../components/PixelIcon';
import { db, getSettings } from '../../db/database';
import { phaseOfDay, TOTAL_DAYS, weekOfDay } from '../../domain/program';
import { SUCCESS_THRESHOLD } from '../../domain/progress';
import type { Profile, Quest } from '../../domain/types';
import { remindPendingQuests } from '../../notifications/notifications';
import { rerollSideQuest, toggleQuest } from '../../quests/actions';
import { skipAiWait, syncStatus } from '../../quests/sync';
import { NotificationPrompt } from './NotificationPrompt';
import { QuestCard } from './QuestCard';
import { ReflectionCard } from './ReflectionCard';

function GeneratingCard({ generating }: { generating: boolean }) {
  return (
    <section className="panel pixel-frame space-y-3 p-4 text-center">
      <PixelIcon name="map" size={32} className="text-amber" />
      <p className="font-pixel text-lg">Haftanın görevleri hazırlanıyor</p>
      {generating && (
        <>
          <p className="text-sm text-muted">Yapay zekâ senin için plan yazıyor, bu bir dakika kadar sürebilir.</p>
          <button type="button" className="pixel-btn pixel-btn-ghost pixel-frame" onClick={skipAiWait}>
            Beklemeden başla
          </button>
        </>
      )}
    </section>
  );
}

function SourceNotice({ lastError, hasKey }: { lastError?: string; hasKey: boolean }) {
  if (lastError) {
    return (
      <p className="text-xs text-muted">
        Yapay zekâya ulaşılamadı, görevler hazır havuzdan geldi. Sonraki günler için yeniden denenecek.{' '}
        <span className="break-words">({lastError})</span>
      </p>
    );
  }
  if (!hasKey) {
    return (
      <p className="text-xs text-muted">
        Görevler hazır havuzdan geliyor.{' '}
        <Link href="/ayarlar" className="text-ice underline">
          API anahtarı ekleyerek
        </Link>{' '}
        sana özel görevler alabilirsin.
      </p>
    );
  }
  return null;
}

function StatusBanner({ mains, threshold }: { mains: Quest[]; threshold: number }) {
  const done = mains.filter((quest) => quest.status === 'done').length;
  const needed = Math.ceil(threshold * mains.length);
  if (done >= needed) {
    return (
      <p className="flex items-center gap-2 bg-panel-high px-3 py-2 text-sm text-moss" role="status">
        <PixelIcon name="check" size={16} />
        Günü kazandın, serin güvende.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 bg-panel-high px-3 py-2 text-sm" role="status">
      <PixelIcon name="flame" size={16} className="text-amber" />
      Seriyi korumak için {needed - done} ana görev daha.
    </p>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-xl">{children}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
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

  const handleToggle = useCallback((quest: Quest) => void toggleQuest(quest.id, todayNumber), [todayNumber]);
  const handleReroll = useCallback((quest: Quest) => void rerollSideQuest(quest.id, todayNumber), [todayNumber]);

  if (todayNumber < 1) {
    return (
      <div className="space-y-4 pt-10 text-center">
        <PixelIcon name="map" size={48} className="text-amber" />
        <h1 className="text-3xl">Macera yarın başlıyor</h1>
        <p className="text-muted">İlk görevlerin {profile.startDate.split('-').reverse().join('.')} günü burada olacak. İyi dinlen.</p>
      </div>
    );
  }

  if (todayNumber > TOTAL_DAYS) {
    return (
      <div className="space-y-4 pt-10 text-center">
        <PixelIcon name="star" size={48} className="text-amber" />
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

  return (
    <div className="space-y-5">
      <header>
        <p className="font-pixel text-sm text-muted">
          {phase.name} evresi · {weekOfDay(todayNumber)}. hafta{week ? `: ${week.theme}` : ''}
        </p>
        <h1 className="text-3xl">
          Gün <span className="text-amber">{todayNumber}</span> / {TOTAL_DAYS}
        </h1>
      </header>

      {quests.length === 0 ? (
        <GeneratingCard generating={generating} />
      ) : (
        <>
          <StatusBanner mains={mains} threshold={SUCCESS_THRESHOLD[day?.difficulty ?? profile.difficulty]} />
          <NotificationPrompt
            dismissed={Boolean(settings.notificationPromptDismissed)}
            onGranted={() => void remindPendingQuests(pendingCount).catch(console.error)}
          />

          {boss && (
            <section className="space-y-2.5" aria-label="Boss görevi">
              <SectionTitle hint="Haftanın son meydan okuması">
                <span className="inline-flex items-center gap-2 text-rose">
                  <PixelIcon name="skull" size={20} />
                  Boss
                </span>
              </SectionTitle>
              <QuestCard quest={boss} onToggle={handleToggle} />
            </section>
          )}

          <section className="space-y-2.5" aria-label="Ana görevler">
            <SectionTitle>Ana görevler</SectionTitle>
            {mains.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onToggle={handleToggle} />
            ))}
          </section>

          <section className="space-y-2.5" aria-label="Yan görevler">
            <SectionTitle hint="Seriyi etkilemez">Yan görevler</SectionTitle>
            {sides.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onToggle={handleToggle}
                onReroll={handleReroll}
                rerollUsed={day?.rerollUsed}
              />
            ))}
          </section>

          <ReflectionCard key={`${todayNumber}-${reflection?.createdAt ?? 0}`} todayNumber={todayNumber} saved={reflection} />

          {week?.source === 'pool' && <SourceNotice lastError={week.lastError} hasKey={settings.apiKey.trim() !== ''} />}
        </>
      )}
    </div>
  );
}

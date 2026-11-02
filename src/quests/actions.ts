import { db } from '../db/database';
import type { Quest, QuestBlueprint, QuestStatus } from '../domain/types';
import { questUsage } from './generator';
import { pickPoolSide, poolBaseId } from './selector';

/** Yalnızca bugünün görevleri işaretlenip geri alınabilir; kaçırılan görevler kilitlidir. */
export async function toggleQuest(id: string, todayNumber: number, now: number = Date.now()): Promise<QuestStatus | null> {
  return db.transaction('rw', db.quests, async () => {
    const quest = await db.quests.get(id);
    if (!quest || quest.dayNumber !== todayNumber || quest.status === 'missed') return null;
    const status: QuestStatus = quest.status === 'done' ? 'pending' : 'done';
    await db.quests.update(id, { status, completedAt: status === 'done' ? now : undefined });
    return status;
  });
}

/** Bir yan görevi değiştirir. Hak günde birdir; önce haftanın yedeklerine, sonra havuza bakar. */
export async function rerollSideQuest(id: string, todayNumber: number): Promise<Quest | null> {
  return db.transaction('rw', db.quests, db.spares, db.days, async () => {
    const quest = await db.quests.get(id);
    const day = await db.days.get(todayNumber);
    if (!quest || !day || day.rerollUsed) return null;
    if (quest.type !== 'side' || quest.status !== 'pending' || quest.dayNumber !== todayNumber) return null;

    const todayQuests = await db.quests.where('dayNumber').equals(todayNumber).toArray();
    const todayTitles = new Set(todayQuests.map((item) => item.title));
    const spares = await db.spares.where('weekNumber').equals(quest.weekNumber).toArray();
    const spare = spares.find((item) => !item.used && !todayTitles.has(item.title));

    let blueprint: QuestBlueprint;
    if (spare) {
      const { weekNumber: _week, source: _source, used: _used, ...rest } = spare;
      blueprint = rest;
      await db.spares.update(spare.id, { used: true });
    } else {
      const allQuests = await db.quests.toArray();
      blueprint = pickPoolSide(
        questUsage(allQuests),
        new Set(todayQuests.map((item) => poolBaseId(item.id))),
        `r${todayNumber}`,
      );
    }

    const replacement: Quest = {
      ...blueprint,
      dayNumber: quest.dayNumber,
      weekNumber: quest.weekNumber,
      order: quest.order,
      status: 'pending',
      source: blueprint.id.startsWith('pool-') ? 'pool' : 'ai',
    };
    await db.quests.delete(id);
    await db.quests.add(replacement);
    await db.days.update(todayNumber, { rerollUsed: true });
    return replacement;
  });
}

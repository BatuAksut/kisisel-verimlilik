// Tarihler yerel takvime göre "YYYY-MM-DD" anahtarı olarak tutulur.
// Farklar UTC üzerinden hesaplanır, böylece yaz saati geçişleri gün sayısını kaydırmaz.

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function keyToUtc(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

const MS_PER_DAY = 86_400_000;

export function diffDays(fromKey: string, toKey: string): number {
  return Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / MS_PER_DAY);
}

export function addDays(key: string, amount: number): string {
  const shifted = new Date(keyToUtc(key) + amount * MS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

/** Başlangıç günü 1. gündür; başlangıçtan önceki tarihler 0 veya negatif döner. */
export function dayNumberFor(startKey: string, todayKey: string): number {
  return diffDays(startKey, todayKey) + 1;
}

// 8-bit ses efektleri dosyasız üretilir. Tarayıcılar sesi ilk dokunuştan sonra açar, o yüzden her şey korumalıdır.
export type Cue = 'complete' | 'undo' | 'reroll' | 'day' | 'level' | 'boss';

type Note = [frequency: number, start: number, length: number];

const CUES: Record<Cue, { notes: Note[]; vibrate?: number | number[] }> = {
  complete: { notes: [[660, 0, 0.07], [990, 0.07, 0.1]], vibrate: 15 },
  undo: { notes: [[330, 0, 0.08]] },
  reroll: { notes: [[440, 0, 0.05], [550, 0.05, 0.05], [440, 0.1, 0.05]], vibrate: 8 },
  day: { notes: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.18]], vibrate: [20, 40, 20] },
  level: { notes: [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.09], [1047, 0.27, 0.25]], vibrate: [30, 50, 30, 50, 60] },
  boss: { notes: [[196, 0, 0.12], [262, 0.12, 0.12], [392, 0.24, 0.12], [784, 0.36, 0.3]], vibrate: [60, 40, 60, 40, 120] },
};

let enabled = true;
let audio: AudioContext | null = null;

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function playCue(cue: Cue) {
  const { notes, vibrate } = CUES[cue];
  try {
    if (vibrate) navigator.vibrate?.(vibrate);
    if (!enabled) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime;
    for (const [frequency, start, length] of notes) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, now + start);
      gain.gain.linearRampToValueAtTime(0, now + start + length);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + length);
    }
  } catch {
    // Ses yoksa uygulama sessiz çalışır.
  }
}

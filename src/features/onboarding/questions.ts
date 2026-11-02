import { AREAS, AREA_LABELS, type Area, type Difficulty, type OnboardingAnswers } from '../../domain/types';

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
}

export type Question =
  | { id: string; kind: 'multi'; title: string; hint?: string; options: QuestionOption[]; max: number }
  | { id: string; kind: 'single'; title: string; hint?: string; options: QuestionOption[] }
  | { id: string; kind: 'time'; title: string; hint?: string; initial: string }
  | { id: string; kind: 'text'; title: string; hint?: string; placeholder: string };

export type AnswerValues = Record<string, string | string[]>;

const labelled = (labels: string[]): QuestionOption[] => labels.map((label) => ({ value: label, label }));

export const QUESTIONS: Question[] = [
  {
    id: 'goals',
    kind: 'multi',
    title: 'Bu 66 günün sonunda neyi değiştirmiş olmak istersin?',
    hint: 'En fazla 3 hedef seç.',
    max: 3,
    options: labelled([
      'Daha enerjik hissetmek',
      'Uyku düzenimi oturtmak',
      'Daha güçlü ve hareketli olmak',
      'Odaklanıp işimi bitirmek',
      'Telefona daha az takılmak',
      'Daha düzenli beslenmek',
      'İlişkilerime daha çok vakit ayırmak',
      'Yeni bir şey öğrenmek',
    ]),
  },
  { id: 'wakeTime', kind: 'time', title: 'Genelde kaçta uyanıyorsun?', initial: '07:30' },
  { id: 'sleepTime', kind: 'time', title: 'Genelde kaçta uyuyorsun?', initial: '23:30' },
  {
    id: 'freeMinutes',
    kind: 'single',
    title: 'Görevlere günde ne kadar zaman ayırabilirsin?',
    options: [
      { value: '20', label: '20 dakikadan az' },
      { value: '40', label: '20-40 dakika' },
      { value: '60', label: '1 saat kadar' },
      { value: '90', label: '1,5 saat kadar' },
      { value: '120', label: '2 saat veya daha fazla' },
    ],
  },
  {
    id: 'habit:uyku',
    kind: 'single',
    title: 'Uyku: Şu an uykun nasıl?',
    options: labelled([
      'Her gün benzer saatte, yeterince uyuyorum',
      'Süre yeterli ama saatlerim karışık',
      'Çoğu gece az uyuyorum',
      'Uykuya dalmakta zorlanıyorum',
    ]),
  },
  {
    id: 'habit:su',
    kind: 'single',
    title: 'Su: Günde kaç bardak su içiyorsun?',
    options: labelled(['3 bardaktan az', '3-5 bardak', '6-8 bardak', '8 bardaktan fazla']),
  },
  {
    id: 'habit:hareket',
    kind: 'single',
    title: 'Hareket: Haftada kaç gün egzersiz yapıyorsun?',
    hint: 'Tempolu yürüyüş de sayılır.',
    options: labelled(['Hiç', '1-2 gün', '3-4 gün', '5 gün veya daha fazla']),
  },
  {
    id: 'habit:zihin',
    kind: 'single',
    title: 'Zihin ve odak: Dikkatini ne kadar toplayabiliyorsun?',
    options: labelled([
      'Birkaç dakikada dağılıyorum',
      '20 dakika kadar odaklanabiliyorum',
      '1 saat kadar odaklanabiliyorum',
      'Düzenli meditasyon veya odak rutinim var',
    ]),
  },
  {
    id: 'habit:ekran',
    kind: 'single',
    title: 'Ekran süresi: Telefonda günde kaç saat geçiriyorsun?',
    options: labelled(['2 saatten az', '2-4 saat', '4-6 saat', '6 saatten fazla']),
  },
  {
    id: 'habit:beslenme',
    kind: 'single',
    title: 'Beslenme: Öğünlerin genelde nasıl?',
    options: labelled([
      'Çoğunlukla evde hazırlanmış, düzenli',
      'Karışık, bazen dışarıdan',
      'Çoğunlukla dışarıdan veya hazır',
      'Saatlerim çok düzensiz',
    ]),
  },
  {
    id: 'habit:sosyal',
    kind: 'single',
    title: 'Sosyal: Sevdiklerinle ne sıklıkla vakit geçiriyorsun?',
    options: labelled(['Neredeyse her gün', 'Haftada birkaç kez', 'Haftada bir', 'Ayda bir veya daha az']),
  },
  {
    id: 'habit:ogrenme',
    kind: 'single',
    title: 'Öğrenme: Yeni bir şey öğrenmeye ne kadar vakit ayırıyorsun?',
    options: labelled(['Her gün', 'Haftada birkaç kez', 'Ara sıra', 'Hemen hiç']),
  },
  {
    id: 'focusAreas',
    kind: 'multi',
    title: 'En çok hangi alanlarda ilerlemek istiyorsun?',
    hint: 'En fazla 3 alan seç. Görevler buraya ağırlık verir.',
    max: 3,
    options: AREAS.map((area) => ({ value: area, label: AREA_LABELS[area] })),
  },
  {
    id: 'difficulty',
    kind: 'single',
    title: 'Zorluk seviyeni seç',
    hint: 'Sonradan Ayarlar’dan değiştirebilirsin.',
    options: [
      { value: 'kolay', label: 'Kolay', hint: 'Günde 3 ana görev. Yarısını bitirmek seriyi korur.' },
      { value: 'normal', label: 'Normal', hint: 'Günde 4 ana görev. %70’ini bitirmek seriyi korur.' },
      { value: 'hard', label: 'Hard Mode', hint: 'Günde 5 ana görev. Hepsi şart, kaçıranın XP’si düşer.' },
    ],
  },
  {
    id: 'interests',
    kind: 'text',
    title: 'Yan görevler sana özel olsun: Nelerden hoşlanırsın?',
    hint: 'İsteğe bağlı. Hobilerin, ilgi alanların, şehrin.',
    placeholder: 'Örn: gitar, fotoğrafçılık, kedim, bisiklet',
  },
];

export function isQuestionAnswered(question: Question, value: string | string[] | undefined): boolean {
  switch (question.kind) {
    case 'multi':
      return Array.isArray(value) && value.length > 0;
    case 'single':
    case 'time':
      return typeof value === 'string' && value !== '';
    case 'text':
      return true;
  }
}

export function toAnswers(values: AnswerValues): { answers: OnboardingAnswers; difficulty: Difficulty } {
  const habits = Object.fromEntries(AREAS.map((area) => [area, String(values[`habit:${area}`] ?? '')])) as Record<
    Area,
    string
  >;
  return {
    difficulty: values.difficulty as Difficulty,
    answers: {
      goals: values.goals as string[],
      wakeTime: values.wakeTime as string,
      sleepTime: values.sleepTime as string,
      freeMinutes: Number(values.freeMinutes),
      habits,
      focusAreas: values.focusAreas as Area[],
      interests: String(values.interests ?? '').trim(),
    },
  };
}

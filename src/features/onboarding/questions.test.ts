import { describe, expect, it } from 'vitest';
import { AREAS } from '../../domain/types';
import { isQuestionAnswered, QUESTIONS, toAnswers } from './questions';

describe('onboarding soruları', () => {
  it('10-15 soru arasındadır ve 8 alışkanlık alanını kapsar', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(10);
    expect(QUESTIONS.length).toBeLessThanOrEqual(15);
    for (const area of AREAS) {
      expect(QUESTIONS.some((question) => question.id === `habit:${area}`)).toBe(true);
    }
  });

  it('tek yazı sorusu boş geçilebilir, diğerleri cevap ister', () => {
    for (const question of QUESTIONS) {
      expect(isQuestionAnswered(question, undefined)).toBe(question.kind === 'text');
    }
  });

  it('cevapları profile dönüştürür', () => {
    const { answers, difficulty } = toAnswers({
      goals: ['Odaklanıp işimi bitirmek'],
      wakeTime: '07:00',
      sleepTime: '23:00',
      freeMinutes: '60',
      'habit:su': '3-5 bardak',
      focusAreas: ['su', 'uyku'],
      difficulty: 'hard',
      interests: '  gitar ',
    });
    expect(difficulty).toBe('hard');
    expect(answers.freeMinutes).toBe(60);
    expect(answers.habits.su).toBe('3-5 bardak');
    expect(answers.habits.uyku).toBe('');
    expect(answers.interests).toBe('gitar');
  });
});

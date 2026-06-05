// Juror evaluation criteria (RU-only - the staff cabinet is Russian-only).
// The evaluation form, validation, and the finish-gate are all driven by this
// array, so adding/removing/renaming a criterion is a one-line change here.
export const REVIEW_CRITERIA = [
  {
    key: 'craft',
    title: 'Идея важнее техники',
    hint: 'Высокая техника ≠ сильное искусство. Жюри смотрит на язык художника, идею и атмосферу, а не на академическую безупречность - иногда «грубая», но честная работа сильнее идеально исполненной.',
  },
  {
    key: 'originality',
    title: 'Оригинальность',
    hint: 'Главный вопрос жюри - «я уже видел это сто раз?». Безупречная техника не спасёт, если работа говорит чужим языком. Нам важен ваш собственный мир: узнаваемый почерк, своя символика, новая визуальная идея.',
  },
];

export const MIN_REVIEW_CHARS = 130;
export const MAX_RATING = 10;

// One criterion entry is valid when it has a rating (0..MAX_RATING) and the
// text reaches the minimum length.
export function isCriterionValid(entry) {
  if (!entry) return false;
  const ratingOk = Number.isInteger(entry.rating) && entry.rating >= 0 && entry.rating <= MAX_RATING;
  const textOk = (entry.text || '').trim().length >= MIN_REVIEW_CHARS;
  return ratingOk && textOk;
}

// The whole evaluation is finishable when every criterion is valid.
export function isEvaluationComplete(scores) {
  return REVIEW_CRITERIA.every((c) => isCriterionValid(scores?.[c.key]));
}

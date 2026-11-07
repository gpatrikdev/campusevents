import { z } from 'zod';

// Review forms are stored as the subset of SurveyJS JSON that the free
// renderer displays. Strict objects keep out SurveyJS properties such as
// `choicesByUrl` or `visibleIf` that the app does not support.

const TITLE = 'Give every question a title of up to 300 characters.';
const CHOICES = 'Give each choice question 2 to 20 different options of up to 200 characters.';
const NO_QUESTIONS = 'Add at least one question.';
const TOO_MANY = 'A review form can have up to 30 questions.';
const FORM = 'Check the review form questions.';
const TEMPLATE_NAME = 'Give the template a name of up to 120 characters.';
const formMessages = new Set([TITLE, CHOICES, NO_QUESTIONS, TOO_MANY]);

const base = {
  name: z.string().regex(/^q[a-z0-9]{1,16}$/),
  title: z.string().trim().min(1, TITLE).max(300, TITLE),
  isRequired: z.boolean(),
};
const choices = z
  .array(z.string().trim().min(1, CHOICES).max(200, CHOICES))
  .min(2, CHOICES)
  .max(20, CHOICES)
  .refine((items) => new Set(items).size === items.length, CHOICES);
const choiceQuestion = <T extends 'radiogroup' | 'checkbox' | 'dropdown'>(type: T) =>
  z.strictObject({ ...base, type: z.literal(type), choices });

export const questionSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...base,
    type: z.literal('rating'),
    rateMin: z.literal(1),
    rateMax: z.literal(5),
    displayMode: z.literal('buttons'),
  }),
  choiceQuestion('radiogroup'),
  choiceQuestion('checkbox'),
  choiceQuestion('dropdown'),
  z.strictObject({ ...base, type: z.literal('boolean') }),
  z.strictObject({ ...base, type: z.literal('text'), inputType: z.literal('number') }),
  z.strictObject({ ...base, type: z.literal('comment'), maxLength: z.literal(2000) }),
]);

export const reviewFormSchema = z.strictObject({
  elements: z
    .array(questionSchema)
    .min(1, NO_QUESTIONS)
    .max(30, TOO_MANY)
    .refine((items) => new Set(items.map((item) => item.name)).size === items.length, FORM),
});

export const templateSchema = z.strictObject({
  name: z.string().trim().min(1, TEMPLATE_NAME).max(120, TEMPLATE_NAME),
  form: reviewFormSchema,
});

export type ReviewForm = z.infer<typeof reviewFormSchema>;
export type Question = ReviewForm['elements'][number];
/** The kinds staff choose from. A number question is SurveyJS `text` with `inputType: 'number'`. */
export type QuestionKind = Exclude<Question['type'], 'text'> | 'number';
export const questionKinds: QuestionKind[] = [
  'rating',
  'radiogroup',
  'checkbox',
  'dropdown',
  'boolean',
  'number',
  'comment',
];
export const kindOf = (question: Question): QuestionKind =>
  question.type === 'text' ? 'number' : question.type;

export interface ReviewTemplate {
  id: string;
  name: string;
  form: ReviewForm;
}

/** The first problem a staff member can fix, or null when the form is valid. */
export function formIssue(form: unknown) {
  const result = reviewFormSchema.safeParse(form);
  if (result.success) return null;
  const message = result.error.issues[0]?.message;
  return message && formMessages.has(message) ? message : FORM;
}

export function templateIssue(template: { name: string; form: unknown }) {
  const result = templateSchema.shape.name.safeParse(template.name);
  return result.success ? formIssue(template.form) : TEMPLATE_NAME;
}

/** A new question of the given kind, with a fresh name and the fields SurveyJS needs. */
export function newQuestion(kind: QuestionKind, title = ''): Question {
  const common = { name: `q${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`, title };
  const isRequired = false;
  switch (kind) {
    case 'rating':
      return {
        ...common,
        isRequired,
        type: 'rating',
        rateMin: 1,
        rateMax: 5,
        displayMode: 'buttons',
      };
    case 'radiogroup':
    case 'checkbox':
    case 'dropdown':
      return { ...common, isRequired, type: kind, choices: ['', ''] };
    case 'boolean':
      return { ...common, isRequired, type: 'boolean' };
    case 'number':
      return { ...common, isRequired, type: 'text', inputType: 'number' };
    case 'comment':
      return { ...common, isRequired, type: 'comment', maxLength: 2000 };
  }
}

export type Answer = string | number | boolean | string[];
export type ReviewAnswers = Record<string, Answer>;

export const answersSchema = z.record(
  z.string().max(20),
  z.union([z.string().max(2000), z.number(), z.boolean(), z.array(z.string().max(200)).max(20)]),
);

const REQUIRED = 'Answer every required question.';
const MISMATCH = 'One or more answers do not match the review form.';

const isEmpty = (value: Answer | undefined) =>
  value === undefined ||
  (typeof value === 'string' && !value.trim()) ||
  (Array.isArray(value) && value.length === 0);

function fits(question: Question, value: Answer) {
  switch (question.type) {
    case 'rating':
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
    case 'radiogroup':
    case 'dropdown':
      return typeof value === 'string' && question.choices.includes(value);
    case 'checkbox':
      return (
        Array.isArray(value) &&
        new Set(value).size === value.length &&
        value.every((item) => question.choices.includes(item))
      );
    case 'boolean':
      return typeof value === 'boolean';
    case 'text':
      return typeof value === 'number' && Number.isFinite(value);
    case 'comment':
      return typeof value === 'string' && value.length <= 2000;
  }
}

/** Checks submitted answers against the event's form. Optional questions may be left out. */
export function answersIssue(form: ReviewForm, answers: ReviewAnswers) {
  const names = new Set(form.elements.map((question) => question.name));
  if (Object.keys(answers).some((name) => !names.has(name))) return MISMATCH;
  for (const question of form.elements) {
    const value = answers[question.name];
    if (isEmpty(value)) {
      if (question.isRequired) return REQUIRED;
    } else if (!fits(question, value)) return MISMATCH;
  }
  return null;
}

type Summary<K extends string, T> = { name: string; title: string; count: number; kind: K } & T;
export type QuestionSummary =
  | Summary<'rating', { average: number; scores: number[] }>
  | Summary<'number', { average: number; min: number; max: number }>
  | Summary<'boolean', { yes: number; no: number }>
  | Summary<'choice', { options: { label: string; count: number }[] }>
  | Summary<'text', { answers: string[] }>;

export interface ReviewResults {
  count: number;
  questions: QuestionSummary[];
}

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/**
 * Per-question results. Answers are never grouped by response, and free-text
 * answers are sorted so their order does not reveal who wrote them.
 */
export function summarize(form: ReviewForm | null, responses: ReviewAnswers[]): ReviewResults {
  const questions = (form?.elements ?? []).map((question): QuestionSummary => {
    const values = responses.map((response) => response[question.name]).filter((v) => !isEmpty(v));
    const common = { name: question.name, title: question.title, count: values.length };
    switch (question.type) {
      case 'rating': {
        const numbers = values as number[];
        const scores = [1, 2, 3, 4, 5].map((score) => numbers.filter((n) => n === score).length);
        return { ...common, kind: 'rating', average: mean(numbers), scores };
      }
      case 'text': {
        const numbers = values as number[];
        return {
          ...common,
          kind: 'number',
          average: mean(numbers),
          min: numbers.length ? Math.min(...numbers) : 0,
          max: numbers.length ? Math.max(...numbers) : 0,
        };
      }
      case 'boolean':
        return {
          ...common,
          kind: 'boolean',
          yes: values.filter((value) => value === true).length,
          no: values.filter((value) => value === false).length,
        };
      case 'comment':
        return {
          ...common,
          kind: 'text',
          answers: (values as string[]).map((value) => value.trim()).sort(),
        };
      default:
        return {
          ...common,
          kind: 'choice',
          options: question.choices.map((label) => ({
            label,
            count: values.filter((value) =>
              Array.isArray(value) ? value.includes(label) : value === label,
            ).length,
          })),
        };
    }
  });
  return { count: responses.length, questions };
}

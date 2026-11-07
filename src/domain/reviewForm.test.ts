import { describe, expect, it } from 'vitest';
import {
  answersIssue,
  formIssue,
  newQuestion,
  type Question,
  type ReviewForm,
  reviewFormSchema,
  summarize,
  templateIssue,
} from './reviewForm';

const question = <T extends Question>(item: T) => item;
const form: ReviewForm = {
  elements: [
    question({
      type: 'rating',
      name: 'qrating',
      title: 'Overall',
      isRequired: true,
      rateMin: 1,
      rateMax: 5,
      displayMode: 'buttons',
    }),
    question({
      type: 'radiogroup',
      name: 'qone',
      title: 'One',
      isRequired: false,
      choices: ['A', 'B'],
    }),
    question({
      type: 'checkbox',
      name: 'qmany',
      title: 'Many',
      isRequired: false,
      choices: ['A', 'B', 'C'],
    }),
    question({
      type: 'dropdown',
      name: 'qpick',
      title: 'Pick',
      isRequired: false,
      choices: ['X', 'Y'],
    }),
    question({ type: 'boolean', name: 'qyes', title: 'Yes?', isRequired: false }),
    question({
      type: 'text',
      name: 'qnum',
      title: 'Number',
      isRequired: false,
      inputType: 'number',
    }),
    question({
      type: 'comment',
      name: 'qtext',
      title: 'Text',
      isRequired: false,
      maxLength: 2000,
    }),
  ],
};

describe('review form schema', () => {
  it('accepts every supported question type', () => {
    expect(reviewFormSchema.safeParse(form).success).toBe(true);
  });
  it.each([
    ['no questions', { elements: [] }, 'Add at least one question.'],
    [
      'an empty title',
      { elements: [{ ...form.elements[0], title: '  ' }] },
      'Give every question a title of up to 300 characters.',
    ],
    [
      'one option',
      { elements: [{ ...form.elements[1], choices: ['A'] }] },
      'Give each choice question 2 to 20 different options of up to 200 characters.',
    ],
    [
      'repeated options',
      { elements: [{ ...form.elements[1], choices: ['A', ' A'] }] },
      'Give each choice question 2 to 20 different options of up to 200 characters.',
    ],
    [
      'repeated names',
      { elements: [form.elements[0], form.elements[0]] },
      'Check the review form questions.',
    ],
    [
      'an unsupported type',
      { elements: [{ ...form.elements[0], type: 'matrix' }] },
      'Check the review form questions.',
    ],
    [
      'an unsupported property',
      { elements: [{ ...form.elements[3], choicesByUrl: { url: 'https://example.test' } }] },
      'Check the review form questions.',
    ],
  ])('rejects %s', (_label, value, message) => {
    expect(formIssue(value)).toBe(message);
  });
  it('requires a template name', () => {
    expect(templateIssue({ name: ' ', form })).toBe(
      'Give the template a name of up to 120 characters.',
    );
    expect(templateIssue({ name: 'Feedback', form })).toBeNull();
  });
  it('creates new questions that pass once they have a title and options', () => {
    for (const kind of ['rating', 'checkbox', 'boolean', 'number', 'comment'] as const) {
      const item = newQuestion(kind, 'Title');
      if ('choices' in item) item.choices = ['A', 'B'];
      expect(formIssue({ elements: [item] })).toBeNull();
    }
  });
});

describe('review answers', () => {
  it('accepts a complete answer set and leaves optional questions out', () => {
    expect(answersIssue(form, { qrating: 3 })).toBeNull();
    expect(
      answersIssue(form, {
        qrating: 5,
        qone: 'B',
        qmany: ['A', 'C'],
        qpick: 'X',
        qyes: false,
        qnum: 2.5,
        qtext: 'Fine',
      }),
    ).toBeNull();
  });
  it.each([
    ['a missing required answer', { qtext: 'Hi' }, 'Answer every required question.'],
    ['a blank optional answer', { qrating: 4, qtext: '   ' }, null],
    ['an unknown question', { qrating: 4, qother: 'x' }],
    ['a rating out of range', { qrating: 6 }],
    ['a fractional rating', { qrating: 4.5 }],
    ['a value outside the options', { qrating: 4, qone: 'C' }],
    ['a repeated checkbox option', { qrating: 4, qmany: ['A', 'A'] }],
    ['a string for yes/no', { qrating: 4, qyes: 'true' }],
    ['text for a number', { qrating: 4, qnum: '3' }],
    ['an infinite number', { qrating: 4, qnum: Number.POSITIVE_INFINITY }],
    ['over-long text', { qrating: 4, qtext: 'x'.repeat(2001) }],
  ])(
    'handles %s',
    (_label, answers, expected = 'One or more answers do not match the review form.') => {
      expect(answersIssue(form, answers as never)).toBe(expected);
    },
  );
});

describe('review results', () => {
  it('summarizes each question without grouping answers by response', () => {
    const results = summarize(form, [
      { qrating: 5, qone: 'A', qmany: ['A', 'B'], qyes: true, qnum: 2, qtext: 'Zebra' },
      { qrating: 3, qone: 'A', qmany: ['B'], qyes: false, qnum: 6, qtext: ' Apple ' },
      { qrating: 4, qpick: 'Y', qtext: '' },
    ]);
    expect(results.count).toBe(3);
    const [rating, one, many, pick, yes, num, text] = results.questions;
    expect(rating).toMatchObject({ kind: 'rating', count: 3, average: 4, scores: [0, 0, 1, 1, 1] });
    expect(one).toMatchObject({
      kind: 'choice',
      count: 2,
      options: [
        { label: 'A', count: 2 },
        { label: 'B', count: 0 },
      ],
    });
    expect(many).toMatchObject({ options: [{ count: 1 }, { count: 2 }, { count: 0 }] });
    expect(pick).toMatchObject({ count: 1, options: [{ count: 0 }, { count: 1 }] });
    expect(yes).toMatchObject({ kind: 'boolean', yes: 1, no: 1 });
    expect(num).toMatchObject({ kind: 'number', count: 2, average: 4, min: 2, max: 6 });
    expect(text).toMatchObject({ kind: 'text', count: 2, answers: ['Apple', 'Zebra'] });
  });
  it('reports zeros when nobody answered', () => {
    const [rating, , , , , num] = summarize(form, []).questions;
    expect(rating).toMatchObject({ count: 0, average: 0 });
    expect(num).toMatchObject({ count: 0, min: 0, max: 0 });
  });
});

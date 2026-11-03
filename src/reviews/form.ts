import type { ITheme } from 'survey-core';

export const reviewForm = {
  showQuestionNumbers: 'off',
  showCompletedPage: false,
  elements: [
    {
      type: 'rating',
      name: 'rating',
      title: { default: 'Overall rating', hu: 'Összesített értékelés' },
      isRequired: true,
      rateMin: 1,
      rateMax: 5,
      displayMode: 'buttons',
    },
    {
      type: 'comment',
      name: 'comment',
      title: { default: 'Comment (optional)', hu: 'Megjegyzés (nem kötelező)' },
      maxLength: 2000,
    },
  ],
};

// SurveyJS v3 semantic tokens follow the unmodified Astryx Neutral theme.
export const reviewTheme: ITheme = {
  themeName: 'default',
  isPanelless: true,
  cssVariables: {
    '--sjs2-typography-font-family-text': 'var(--font-family-body)',
    '--sjs2-color-project-brand-600': 'var(--color-text-primary)',
    '--sjs2-color-project-brand-700': 'var(--color-text-primary)',
    '--sjs2-color-project-brand-800': 'var(--color-text-primary)',
    '--sjs2-color-bg-basic-primary': 'var(--color-background-surface)',
    '--sjs2-color-bg-basic-secondary': 'var(--color-background-muted)',
    '--sjs2-color-bg-basic-tertiary': 'var(--color-background-muted)',
    '--sjs2-color-bg-basic-primary-dim': 'var(--color-background-muted)',
    '--sjs2-color-bg-basic-secondary-dim': 'var(--color-background-muted)',
    '--sjs2-color-fg-basic-primary': 'var(--color-text-primary)',
    '--sjs2-color-fg-basic-secondary': 'var(--color-text-secondary)',
    '--sjs2-color-fg-basic-tertiary': 'var(--color-text-secondary)',
    '--sjs2-color-fg-brand-on-primary': 'var(--color-background-surface)',
    '--sjs2-color-border-basic-primary': 'var(--color-border-emphasized)',
    '--sjs2-color-border-basic-secondary': 'var(--color-border)',
    '--sjs2-color-utility-surface-survey': 'var(--color-background-surface)',
    '--sjs2-layout-component-page-content-area-padding-horizontal': '0px',
    '--sjs2-layout-component-survey-footer-padding-horizontal': '0px',
    '--sjs2-radius-form': 'var(--radius-2)',
  },
};

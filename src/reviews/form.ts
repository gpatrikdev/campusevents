import type { ITheme } from 'survey-core';

// SurveyJS v3 semantic tokens follow the app's Astryx theme tokens, so the
// brand colour is the theme accent. The sizes copy Astryx's own controls: 14px text with 20px lines, a 36px
// large button, and 1.5px emphasized borders on fields.
export const reviewTheme: ITheme = {
  themeName: 'default',
  isPanelless: true,
  cssVariables: {
    '--sjs2-typography-font-family-text': 'var(--font-family-body)',
    '--sjs2-typography-font-size-default': 'var(--font-size-base)',
    '--sjs2-typography-line-height-default': '1.25rem',
    '--sjs2-typography-font-size-component-question-title': 'var(--font-size-base)',
    '--sjs2-typography-line-height-component-question-title': '1.25rem',
    '--sjs2-typography-font-weight-component-question-title': 'var(--font-weight-medium)',
    '--sjs2-typography-font-size-component-action-large-content': 'var(--font-size-base)',
    '--sjs2-typography-line-height-component-action-large-content': '1.25rem',
    '--sjs2-typography-font-weight-component-action-large-content': 'var(--font-weight-medium)',
    '--sjs2-layout-component-action-large-box-padding-vertical': 'var(--spacing-2)',
    '--sjs2-layout-component-action-large-box-padding-horizontal': 'var(--spacing-3)',
    '--sjs2-color-project-brand-600': 'var(--color-accent)',
    '--sjs2-color-project-brand-700': 'var(--color-text-accent)',
    '--sjs2-color-project-brand-800': 'var(--color-text-accent)',
    '--sjs2-color-bg-basic-primary': 'var(--color-background-surface)',
    '--sjs2-color-bg-basic-secondary': 'var(--color-background-muted)',
    '--sjs2-color-bg-basic-tertiary': 'var(--color-background-muted)',
    '--sjs2-color-bg-basic-primary-dim': 'var(--color-background-muted)',
    '--sjs2-color-bg-basic-secondary-dim': 'var(--color-background-muted)',
    '--sjs2-color-fg-basic-primary': 'var(--color-text-primary)',
    '--sjs2-color-fg-basic-secondary': 'var(--color-text-secondary)',
    '--sjs2-color-fg-basic-tertiary': 'var(--color-text-secondary)',
    '--sjs2-color-fg-brand-on-primary': 'var(--color-on-accent)',
    '--sjs2-color-border-basic-primary': 'var(--color-border-emphasized)',
    '--sjs2-color-border-basic-secondary': 'var(--color-border)',
    '--sjs2-color-utility-surface-survey': 'var(--color-background-surface)',
    // The rating circles' edge. SurveyJS draws it in black at 10% opacity,
    // which disappears on a dark background.
    '--sjs2-color-utility-shadow-surface-default': 'var(--color-border-emphasized)',
    '--sjs2-border-spread-surface-default': 'calc(1.5 * var(--border-width))',
    // The comment field, drawn like an Astryx text field.
    '--sjs2-color-component-formbox-default-bg': 'var(--color-background-surface)',
    '--sjs2-color-component-formbox-default-border': 'var(--color-border-emphasized)',
    '--sjs2-border-spread-form-default': 'calc(1.5 * var(--border-width))',
    '--sjs2-layout-component-survey-box-gap-vertical': 'var(--spacing-6)',
    '--sjs2-layout-component-page-box-gap-vertical': 'var(--spacing-6)',
    '--sjs2-layout-component-question-box-gap-vertical': 'var(--spacing-2)',
    '--sjs2-layout-component-page-content-area-padding-horizontal': '0px',
    '--sjs2-layout-component-survey-footer-padding-horizontal': '0px',
    '--sjs2-radius-form': 'var(--radius-element)',
  },
};

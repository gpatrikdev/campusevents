import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { palette } from './elteIkPalette.generated';

// ELTE IK colours, from the faculty colour sheet (elte_ik_kari_szinek_01.pdf):
//   faculty teal  Pantone 321 C       #008C95  (main colour)
//   ELTE blue     Pantone 295 C       #012850  (central ELTE colour)
//   ELTE grey     Cool Gray 11 C      #53565A  (central ELTE colour)
// The sheet allows the central ELTE colours as supplementary colours.
//
// White text on #008C95 is 4.05:1, short of the 4.5:1 that button labels need,
// so filled controls use the next darker stop. The exact teal stays on
// non-text marks (selection rings, chart bars), where 3:1 is enough.
const teal = palette['ik-teal'];
const blue = palette['elte-blue'];
const gray = palette['elte-gray'];
const withAlpha = (color: string, alpha: string) => `${color}${alpha}`;

const sans = 'Open Sans';
const sansFallbacks =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const elteIkTheme = defineTheme({
  name: 'elte-ik',
  extends: neutralTheme,

  // Open Sans is ELTE's central interface typeface. The scale and heading
  // weights repeat Neutral's, because a typography config replaces the base.
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: { family: sans, fallbacks: sansFallbacks },
    heading: { family: sans, fallbacks: sansFallbacks, weights: { 3: 'bold', 4: 'bold' } },
    code: {
      family: 'ui-monospace',
      fallbacks: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  tokens: {
    // Open Sans ships no 500 weight, and the browser would fall back to 400,
    // which flattens labels into body text. SemiBold keeps them distinct.
    '--font-weight-medium': '600',

    '--color-accent': [teal.light[45], teal.dark[60]],
    '--color-accent-muted': [teal.light[95], teal.dark[25]],
    '--color-text-accent': [teal.light[40], teal.dark[70]],
    '--color-icon-accent': [teal.light[45], teal.dark[60]],
    '--color-on-accent': [gray.light[100], gray.dark[5]],

    '--color-text-secondary': [gray.light[35], gray.dark[65]],
    '--color-icon-secondary': [gray.light[45], gray.dark[65]],

    '--color-info': [blue.light[15], blue.dark[70]],
    '--color-info-muted': [blue.light[90], withAlpha(blue.dark[75], '3D')],
    '--color-on-info': [gray.light[100], gray.dark[5]],
    '--color-text-info': [blue.light[40], blue.dark[80]],
    '--color-on-info-muted': [blue.light[25], blue.dark[80]],

    '--color-data-categorical-teal': [teal.light[50], teal.dark[65]],

    '--shadow-inset-hover': `inset 0px 0px 0px 2px ${withAlpha(teal.light[50], '4D')}`,
    '--shadow-inset-selected': `inset 0px 0px 0px 2px ${withAlpha(teal.light[50], '80')}`,
  },
});

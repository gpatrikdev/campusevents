import type { Overrides } from '@astryxdesign/core/i18n';

// Astryx 0.7.9 ships no Hungarian strings for the RichText editor, so its toolbar and
// link dialog fell back to English. These fill the gap until the hu-HU catalog has them.
export const astryxOverrides: Overrides = {
  'hu-HU': {
    '@astryx.richTextEditor.tabEscapeHint':
      'A szerkesztőből az Escape, majd a Tab billentyűvel léphet ki.',
    '@astryx.richTextEditor.toolbar.label': 'Szövegformázás',
    '@astryx.richTextEditor.toolbar.actions': 'Formázási műveletek',
    '@astryx.richTextEditor.toolbar.undo': 'Visszavonás',
    '@astryx.richTextEditor.toolbar.redo': 'Ismétlés',
    '@astryx.richTextEditor.toolbar.historyDivider': 'Előzmények és blokkformátumok',
    '@astryx.richTextEditor.toolbar.blockFormat': 'Blokkformátum',
    '@astryx.richTextEditor.toolbar.formatDivider': 'Blokk- és szövegformátumok',
    '@astryx.richTextEditor.toolbar.paragraph': 'Bekezdés',
    '@astryx.richTextEditor.toolbar.heading1': 'Címsor 1',
    '@astryx.richTextEditor.toolbar.heading2': 'Címsor 2',
    '@astryx.richTextEditor.toolbar.heading3': 'Címsor 3',
    '@astryx.richTextEditor.toolbar.bulletedList': 'Felsorolás',
    '@astryx.richTextEditor.toolbar.numberedList': 'Számozott lista',
    '@astryx.richTextEditor.toolbar.blockQuote': 'Idézet',
    '@astryx.richTextEditor.toolbar.bold': 'Félkövér',
    '@astryx.richTextEditor.toolbar.italic': 'Dőlt',
    '@astryx.richTextEditor.toolbar.underline': 'Aláhúzott',
    '@astryx.richTextEditor.toolbar.strikethrough': 'Áthúzott',
    '@astryx.richTextEditor.toolbar.inlineCode': 'Kód a szövegben',
    '@astryx.richTextEditor.toolbar.link': 'Hivatkozás',
    '@astryx.richTextEditor.link.insertTitle': 'Hivatkozás beszúrása',
    '@astryx.richTextEditor.link.editTitle': 'Hivatkozás szerkesztése',
    '@astryx.richTextEditor.link.url': 'URL',
    '@astryx.richTextEditor.link.invalidUrl':
      'Adjon meg érvényes http, https, mailto vagy tel címet.',
    '@astryx.richTextEditor.link.remove': 'Hivatkozás eltávolítása',
    '@astryx.richTextEditor.link.cancel': 'Mégse',
    '@astryx.richTextEditor.link.add': 'Hivatkozás hozzáadása',
    '@astryx.richTextEditor.link.update': 'Hivatkozás frissítése',
  },
};

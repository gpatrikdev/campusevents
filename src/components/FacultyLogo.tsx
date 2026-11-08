import { useTheme } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import emblemTeal from '../assets/logo/elte-ik-emblem-teal.svg';
import emblemWhite from '../assets/logo/elte-ik-emblem-white.svg';
import enTeal from '../assets/logo/elte-ik-en-teal.svg';
import enWhite from '../assets/logo/elte-ik-en-white.svg';
import huTeal from '../assets/logo/elte-ik-hu-teal.svg';
import huWhite from '../assets/logo/elte-ik-hu-white.svg';
import shortTeal from '../assets/logo/elte-ik-short-teal.svg';
import shortWhite from '../assets/logo/elte-ik-short-white.svg';

// Converted from ELTE IK's own vector logos (rgb_online, "fekvő" layouts),
// cropped to the artwork. Teal is for light surfaces, white for dark ones. The
// emblem is the short logo cropped to its crest and rings.
const logos = {
  emblem: { light: emblemTeal, dark: emblemWhite },
  short: { light: shortTeal, dark: shortWhite },
  hu: { light: huTeal, dark: huWhite },
  en: { light: enTeal, dark: enWhite },
};

/**
 * The faculty logo. `short` ("ELTE | IK") is the only version whose lettering
 * stays legible at top-bar height, and `emblem` fits a phone's top bar beside
 * its controls. `full` adds the faculty name in the page's language and needs
 * at least twice that height.
 */
export function FacultyLogo({
  variant,
  decorative = false,
}: {
  variant: 'emblem' | 'short' | 'full';
  decorative?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { mode } = useTheme();
  const set = variant !== 'full' ? logos[variant] : i18n.language === 'hu' ? logos.hu : logos.en;
  return (
    <img
      src={set[mode]}
      alt={decorative ? '' : t('ELTE Faculty of Informatics')}
      className={`faculty-logo faculty-logo-${variant}`}
    />
  );
}

/** The full faculty logo, centred, for screens without the top bar. */
export function AppBrand() {
  return (
    <VStack hAlign="center">
      <FacultyLogo variant="full" />
    </VStack>
  );
}

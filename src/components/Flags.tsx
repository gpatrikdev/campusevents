import { type SVGProps, useId } from 'react';

type FlagProps = SVGProps<SVGSVGElement>;

/*
 * Flags are artwork, so they keep their official colours in both themes. Each
 * is drawn at 4:3, centred in the square box Icon gives it, with rounded
 * corners and a faint outline that keeps white parts visible on a white nav.
 * They are always hidden from screen readers: a flag names a country, not a
 * language, so the language name beside it is the label.
 */
function Flag({ children, ...props }: FlagProps) {
  const shape = useId();
  return (
    <svg viewBox="0 0 40 30" {...props} aria-hidden="true">
      <clipPath id={shape}>
        <rect width="40" height="30" rx="3" />
      </clipPath>
      <g clipPath={`url(#${shape})`}>{children}</g>
      <rect
        width="40"
        height="30"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function HungaryFlag(props: FlagProps) {
  return (
    <Flag {...props}>
      <rect width="40" height="10" fill="#CE2939" />
      <rect y="10" width="40" height="10" fill="#FFFFFF" />
      <rect y="20" width="40" height="10" fill="#477050" />
    </Flag>
  );
}

/** The Union Jack, with each red diagonal set off-centre as on the real flag. */
export function UnitedKingdomFlag(props: FlagProps) {
  const halves = useId();
  return (
    <Flag {...props}>
      <rect width="40" height="30" fill="#012169" />
      <clipPath id={halves}>
        {/* One triangle beside each diagonal arm keeps one side of its red stripe. */}
        <path d="M20,15 h20 v15 z v15 h-20 z h-20 v-15 z v-15 h20 z" />
      </clipPath>
      <path d="M0,0 L40,30 M40,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path
        d="M0,0 L40,30 M40,0 L0,30"
        stroke="#C8102E"
        strokeWidth="4"
        clipPath={`url(#${halves})`}
      />
      <path d="M20,0 v30 M0,15 h40" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M20,0 v30 M0,15 h40" stroke="#C8102E" strokeWidth="6" />
    </Flag>
  );
}

import type { SVGProps } from 'react';

/* Neutral's icon set has no people icon, so this one is drawn to match it: a
 * 24 by 24 grid, round 2px strokes in the current text colour. It is always
 * decorative, because the nav item's label names the page. */
export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M15 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M17.5 14.3c2.3.6 4 2.6 4 5.7" />
    </svg>
  );
}

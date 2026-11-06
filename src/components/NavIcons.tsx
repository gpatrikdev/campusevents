import type { SVGProps } from 'react';
import { Outline } from './EventIcons';

/* Neutral's icon set has no icons for these pages, so they are drawn to match
 * it: a 24 by 24 grid, round 2px strokes in the current text colour. They are
 * always decorative, because the item's label names the page. */
export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M15 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M17.5 14.3c2.3.6 4 2.6 4 5.7" />
    </Outline>
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M3 11 12 3l9 8" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </Outline>
  );
}

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Outline>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </Outline>
  );
}

// An arrow going in through a door frame.
export function SignInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M3 12h11M10 8l4 4-4 4" />
    </Outline>
  );
}

// An arrow coming out of a door frame.
export function SignOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M10 12h11M17 8l4 4-4 4" />
    </Outline>
  );
}

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
    </Outline>
  );
}

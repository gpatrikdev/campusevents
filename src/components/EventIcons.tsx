import type { SVGProps } from 'react';

// Match the existing Neutral outline icons without adding an icon library.
function Outline(props: SVGProps<SVGSVGElement>) {
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
    />
  );
}

export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="m16 3 5 5L9 20l-6 1 1-6L16 3Z" />
      <path d="m14 5 5 5" />
    </Outline>
  );
}

export function DeleteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M4 7h16M9 7V3h6v4M6 7l1 14h10l1-14M10 11v6M14 11v6" />
    </Outline>
  );
}

export function QrCodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <rect x="3" y="3" width="6" height="6" />
      <rect x="15" y="3" width="6" height="6" />
      <rect x="3" y="15" width="6" height="6" />
      <path d="M15 15h3v3h3M21 12v3M15 21h3" />
    </Outline>
  );
}

export function ReviewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </Outline>
  );
}

export function LocationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Outline>
  );
}

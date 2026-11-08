import type { SVGProps } from 'react';

// Match the existing Neutral outline icons without adding an icon library.
export function Outline(props: SVGProps<SVGSVGElement>) {
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

export function StatisticsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M4 20h16M7 16v-4M12 16V5M17 16V9" />
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

// Six dots, the usual mark for a handle that drags an item to a new place.
export function GripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props} fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </Outline>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M12 5v14M5 12h14" />
    </Outline>
  );
}

// A ticket with a notch on each side and a perforation near one end.
export function TicketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <path d="M5 6h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8a2 2 0 0 1 2-2Z" />
      <path d="M15 6v2M15 11v2M15 16v2" />
    </Outline>
  );
}

// A rosette with two ribbon tails, as on a printed certificate.
export function CertificateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 13.9 7 22l5-3 5 3-1.5-8.1" />
    </Outline>
  );
}

export function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Outline>
  );
}

export function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-11 9" />
    </Outline>
  );
}

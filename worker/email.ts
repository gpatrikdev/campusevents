import { Buffer } from 'node:buffer';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, type PDFFont } from 'pdf-lib';
import QRCode from 'qrcode/lib/server.js';
import { formatDate } from '../src/domain/format';
import type { CampusEvent, Language, User } from '../src/domain/types';
import type { Env } from './env';
import font from './fonts/Caladea-Regular.ttf?inline';

type Attachment = {
  filename: string;
  content: string;
  content_type: string;
  content_id?: string;
};

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

function localMailEndpoint(env: Env) {
  if (!env.LOCAL_EMAIL_ENDPOINT || !env.BETTER_AUTH_URL) return undefined;
  const endpoint = new URL(env.LOCAL_EMAIL_ENDPOINT);
  if (
    new URL(env.BETTER_AUTH_URL).hostname === '127.0.0.1' &&
    endpoint.protocol === 'http:' &&
    endpoint.hostname === '127.0.0.1'
  )
    return endpoint.href;
}

async function sendEmail(
  env: Env,
  email: {
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments?: Attachment[];
  },
  idempotencyKey?: string,
) {
  const local = localMailEndpoint(env);
  if (!env.EMAIL_FROM || (!local && !env.RESEND_API_KEY))
    throw new Error('Email is not configured');
  const response = await fetch(local ?? 'https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
      ...(local ? {} : { Authorization: `Bearer ${env.RESEND_API_KEY}` }),
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...email }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  await response.body?.cancel().catch(() => {});
}

export function sendSignIn(env: Env, to: string, url: string, language: Language) {
  const hu = language === 'hu';
  const title = hu ? 'Bejelentkezés a Campus Events felületére' : 'Sign in to Campus Events';
  return sendEmail(env, {
    to,
    subject: title,
    text: `${title}\n${url}`,
    html: `<p><a href="${escapeHtml(url)}">${title}</a></p>`,
  });
}

type Recipient = Pick<User, 'name' | 'email'> & { language: Language };

export async function sendTicket(env: Env, user: Recipient, event: CampusEvent, ticket: string) {
  const hu = user.language === 'hu';
  const title = hu ? 'A QR-jegyed' : 'Your QR ticket';
  const details = `${event.title}\n${user.name}\n${event.location}\n${formatDate(event.start, event.timezone, user.language)} · ${event.timezone}`;
  const instruction = hu
    ? 'Mutasd be a csatolt QR-jegyet a bejáratnál.'
    : 'Present the attached QR ticket at the entrance.';
  const png = await QRCode.toBuffer(ticket, { width: 320, margin: 4, errorCorrectionLevel: 'M' });
  return sendEmail(env, {
    to: user.email,
    subject: `${title} · ${event.title}`,
    text: `${details}\n\n${instruction}`,
    html: `<p>${escapeHtml(details).replaceAll('\n', '<br>')}</p><p>${instruction}</p><img src="cid:ticket" alt="${title}" width="320" height="320">`,
    attachments: [
      {
        filename: 'ticket.png',
        content: png.toString('base64'),
        content_type: 'image/png',
        content_id: 'ticket',
      },
    ],
  });
}

export function sendReviewInvitation(
  env: Env,
  user: Recipient,
  event: CampusEvent,
  registrationId: string,
) {
  const url = new URL(`/review/${event.id}`, env.BETTER_AUTH_URL).href;
  const label = user.language === 'hu' ? 'Értékeld az eseményt' : 'Review this event';
  return sendEmail(
    env,
    {
      to: user.email,
      subject: `${label} · ${event.title}`,
      text: `${event.title}\n${label}\n${url}`,
      html: `<p>${escapeHtml(event.title)}</p><p><a href="${escapeHtml(url)}">${label}</a></p>`,
    },
    `review-invitation/${registrationId}`,
  );
}

function wrap(text: string, face: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/u)) {
    const next = line ? `${line} ${word}` : word;
    if (face.widthOfTextAtSize(next, size) <= width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const char of word) {
      if (face.widthOfTextAtSize(line + char, size) > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function sendCertificate(
  env: Env,
  user: Recipient,
  event: CampusEvent,
  issuedAt: number,
) {
  const hu = user.language === 'hu';
  const title = hu ? 'Részvételi igazolás' : 'Certificate of attendance';
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const face = await pdf.embedFont(Buffer.from(font.split(',')[1], 'base64'), { subset: true });
  const issueDate = new Intl.DateTimeFormat(user.language, {
    dateStyle: 'long',
    timeZone: event.timezone,
  }).format(issuedAt);
  const eventDate = new Intl.DateTimeFormat(user.language, {
    dateStyle: 'long',
    timeZone: event.timezone,
  }).format(new Date(event.start));
  const details = [
    user.name,
    event.title,
    event.location,
    `${hu ? 'Esemény dátuma' : 'Event date'}: ${eventDate}`,
    `${hu ? 'Kiállítás dátuma' : 'Issue date'}: ${issueDate}`,
  ];
  const groups = details.map((detail) => wrap(detail, face, 14, 499));
  const height = Math.max(
    420,
    160 + groups.reduce((sum, lines) => sum + 10 + lines.length * 19, 0),
  );
  const page = pdf.addPage([595, height]);
  page.drawText(title, { x: 48, y: height - 68, size: 26, font: face });
  let y = height - 114;
  for (const lines of groups) {
    for (const line of lines) {
      page.drawText(line, { x: 48, y, size: 14, font: face });
      y -= 19;
    }
    y -= 10;
  }
  const text = hu
    ? 'A részvételi igazolásodat csatoltuk.'
    : 'Your certificate of attendance is attached.';
  return sendEmail(env, {
    to: user.email,
    subject: `${title} · ${event.title}`,
    text,
    html: `<p>${text}</p>`,
    attachments: [
      {
        filename: hu ? 'igazolas.pdf' : 'certificate.pdf',
        content: await pdf.saveAsBase64(),
        content_type: 'application/pdf',
      },
    ],
  });
}

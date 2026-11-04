import { markdownToEditorStateJSON } from '@astryxdesign/richtext/markdown';
import type { CampusEvent, MockData } from '../domain/types';

export const REFERENCE_NOW = '2026-11-03T11:00:00Z';

function event(
  id: string,
  title: string,
  location: string,
  start: string,
  end: string,
  markdown: string,
  status: CampusEvent['status'] = 'published',
  timezone = 'Europe/Budapest',
): CampusEvent {
  return {
    id,
    title,
    location,
    start,
    end,
    timezone,
    status,
    content: markdownToEditorStateJSON(markdown),
  };
}

function buildFixtures(): MockData {
  return {
    sequence: 100,
    users: [
      {
        id: 'attendee',
        name: 'Kovács Eszter',
        email: 'eszter@example.test',
        role: null,
        profileComplete: true,
      },
      {
        id: 'new',
        name: 'Alex Morgan',
        email: 'alex@example.test',
        role: null,
        profileComplete: false,
      },
      {
        id: 'organizer',
        name: 'Dr. Tóth Anna',
        email: 'anna@example.test',
        role: 'organizer',
        profileComplete: true,
      },
      {
        id: 'admin',
        name: 'Nagy Balázs',
        email: 'balazs@example.test',
        role: 'admin',
        profileComplete: true,
      },
      {
        id: 'guest',
        name: 'Sam Taylor',
        email: 'sam@example.test',
        role: null,
        profileComplete: true,
      },
      {
        id: 'other',
        name: 'Szabó Réka',
        email: 'reka@example.test',
        role: null,
        profileComplete: true,
      },
    ],
    events: [
      event(
        'open-science',
        'Open science in practice',
        'Central Library · Seminar room 2',
        '2026-11-03T10:00:00Z',
        '2026-11-03T13:00:00Z',
        '## Research that everyone can access\n\nA practical session on open research, reproducible methods and sharing your work responsibly.\n\n### Programme\n\n- 11:00 · Open access and research data\n- 12:00 · Hands-on discussion\n- 13:00 · Questions and closing remarks\n\nPlease bring a laptop. The session is held in English.',
      ),
      event(
        'research-forum',
        'Student research forum',
        'Main building · Auditorium',
        '2026-11-04T10:00:00Z',
        '2026-11-04T14:00:00Z',
        '## Share your research\n\nMeet student researchers from across the university. Short presentations are followed by an open discussion.\n\nThe event is held in English.',
      ),
      event(
        'symposium',
        'The future of responsible AI',
        'Science building · Lecture theatre A',
        '2026-11-06T09:00:00Z',
        '2026-11-06T15:00:00Z',
        '## A university conversation on responsible AI\n\nJoin researchers, students and practitioners to consider how artificial intelligence is changing research, education and public life.\n\n### What to expect\n\n- **10:00** · Welcome and opening lecture\n- **11:30** · Research presentations\n- **13:30** · Interdisciplinary panel\n- **15:30** · Audience questions\n\nThe event is held in English. Step-free access is available at the main entrance. Please arrive with your QR ticket ready.',
      ),
      event(
        'library',
        'Tudományos írás műhely',
        'Egyetemi Könyvtár · 104-es terem',
        '2026-11-10T13:00:00Z',
        '2026-11-10T16:00:00Z',
        '## A világos tudományos szöveg\n\nGyakorlati műhely hallgatóknak és kutatóknak. Közösen foglalkozunk a szövegek felépítésével, a hivatkozásokkal és a szerkesztéssel.\n\n### Felkészülés\n\nHozzon magával egy rövid, saját szöveget és egy laptopot. A műhely nyelve magyar.',
      ),
      event(
        'vienna',
        'European research partnerships',
        'Vienna campus · Conference room',
        '2026-11-12T08:30:00Z',
        '2026-11-12T12:00:00Z',
        '## Working across borders\n\nA morning of discussion on shared research projects and academic cooperation.\n\nThe event takes place in Vienna and is held in English.',
        'published',
        'Europe/Vienna',
      ),
      event(
        'ethics',
        'Research ethics roundtable',
        'Main building · Council room',
        '2026-11-02T13:00:00Z',
        '2026-11-02T15:00:00Z',
        '## Research with care\n\nAn interdisciplinary discussion on ethical research methods, consent and responsible publication.',
      ),
      event(
        'archives',
        'Campus archives: an introduction',
        'University Archives · Reading room',
        '2026-11-01T09:00:00Z',
        '2026-11-01T11:00:00Z',
        '## Explore the university archives\n\nA guided introduction to the collections and research facilities.',
      ),
      event(
        'sustainability',
        'Sustainable campuses workshop',
        'Engineering building · Studio 3',
        '2026-10-20T08:00:00Z',
        '2026-10-20T12:00:00Z',
        '## Planning a sustainable campus\n\nAn applied workshop on campus sustainability, energy and the built environment.',
      ),
      event(
        'draft',
        'Digital humanities research day',
        'Humanities building · Room 201',
        '2026-11-20T09:00:00Z',
        '2026-11-20T15:00:00Z',
        '## New methods, shared questions\n\nA day of research talks and practical demonstrations in digital humanities.\n\n### Programme\n\n- Opening lecture\n- Project presentations\n- Roundtable discussion',
        'draft',
      ),
      event(
        'late-draft',
        'Library methods clinic',
        'Central Library · Room 8',
        '2026-11-04T09:00:00Z',
        '2026-11-04T11:00:00Z',
        '## Research methods clinic\n\nA small-group workshop on research methods.',
        'draft',
      ),
    ],
    registrations: [
      {
        id: 'r1',
        eventId: 'symposium',
        userId: 'attendee',
        ticket: 'DEMO-symposium-r1',
        active: true,
        checkedIn: false,
        reviewed: false,
        certificate: 'none',
      },
      {
        id: 'r2',
        eventId: 'open-science',
        userId: 'attendee',
        ticket: 'DEMO-open-science-r2',
        active: true,
        checkedIn: false,
        reviewed: false,
        certificate: 'none',
      },
      {
        id: 'r3',
        eventId: 'ethics',
        userId: 'attendee',
        ticket: 'DEMO-ethics-r3',
        active: true,
        checkedIn: true,
        reviewed: false,
        certificate: 'none',
      },
      {
        id: 'r4',
        eventId: 'sustainability',
        userId: 'attendee',
        ticket: 'DEMO-sustainability-r4',
        active: true,
        checkedIn: true,
        reviewed: true,
        certificate: 'sent',
      },
      {
        id: 'r5',
        eventId: 'archives',
        userId: 'attendee',
        ticket: 'DEMO-archives-r5',
        active: true,
        checkedIn: false,
        reviewed: false,
        certificate: 'none',
      },
      {
        id: 'r6',
        eventId: 'open-science',
        userId: 'guest',
        ticket: 'DEMO-open-science-r6',
        active: true,
        checkedIn: true,
        reviewed: false,
        certificate: 'none',
      },
      {
        id: 'r7',
        eventId: 'open-science',
        userId: 'other',
        ticket: 'DEMO-open-science-r7',
        active: false,
        checkedIn: false,
        reviewed: false,
        certificate: 'none',
      },
    ],
    reviews: [
      {
        id: 'review-1',
        eventId: 'ethics',
        rating: 5,
        comment: 'The examples from different disciplines made the discussion useful.',
      },
      {
        id: 'review-2',
        eventId: 'ethics',
        rating: 4,
        comment: 'Több időt hagynék a közös beszélgetésre.',
      },
      { id: 'review-3', eventId: 'ethics', rating: 5, comment: '' },
      {
        id: 'review-4',
        eventId: 'sustainability',
        rating: 4,
        comment: 'Clear and practical. Thank you.',
      },
    ],
  };
}

export const clocks = {
  reference: REFERENCE_NOW,
  cutoff: '2026-11-05T09:00:00Z',
  checkin: '2026-11-06T08:00:00Z',
  start: '2026-11-06T09:00:00Z',
  end: '2026-11-06T15:00:00Z',
  reviewClosed: '2026-11-09T15:00:00Z',
};

const fixtures = buildFixtures();

export function createFixtures(): MockData {
  return structuredClone(fixtures);
}

import type { ReviewAnswers, ReviewForm, ReviewResults, ReviewTemplate } from './reviewForm';

export type { ReviewAnswers, ReviewForm, ReviewResults, ReviewTemplate };

export type Role = 'organizer' | 'admin' | null;
export type Language = 'en' | 'hu';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileComplete: boolean;
  language?: Language;
}

export interface CampusEvent {
  id: string;
  title: string;
  location: string;
  start: string;
  end: string;
  timezone: string;
  content: string;
  banner: string | null;
  form: ReviewForm | null;
  status: 'draft' | 'published';
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  ticket?: string;
  active: boolean;
  checkedIn: boolean;
  /** The owner's own answers. Only that attendee's API responses include them. */
  review: ReviewAnswers | null;
  certificate: 'none' | 'pending' | 'sent' | 'failed';
}

export interface Review {
  id: string;
  eventId: string;
  answers: ReviewAnswers;
}

export interface MockData {
  events: CampusEvent[];
  users: User[];
  registrations: Registration[];
  reviews: Review[];
  templates: ReviewTemplate[];
  sequence: number;
}

export interface Outcome {
  ok: boolean;
  message: string;
  id?: string;
  warning?: boolean;
  checkedInAt?: string;
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  checkedIn: boolean;
}

export type Action =
  | { type: 'join' | 'publish' | 'unpublish' | 'delete' | 'certificate'; eventId: string }
  | { type: 'cancel'; registrationId: string }
  | { type: 'scan'; eventId: string; ticket: string }
  | { type: 'review'; eventId: string; answers: ReviewAnswers }
  | { type: 'saveTemplate'; template: ReviewTemplate }
  | { type: 'deleteTemplate'; templateId: string }
  | { type: 'save'; event: CampusEvent }
  | { type: 'profile'; name: string }
  | { type: 'role'; userId: string; organizer: boolean };

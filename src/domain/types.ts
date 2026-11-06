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

export interface ReviewAnswers {
  rating: number;
  comment: string;
}

export interface Review extends ReviewAnswers {
  id: string;
  eventId: string;
}

export interface MockData {
  events: CampusEvent[];
  users: User[];
  registrations: Registration[];
  reviews: Review[];
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

export interface ReviewResults {
  count: number;
  average: number;
  comments: string[];
}

export type Action =
  | { type: 'join' | 'publish' | 'unpublish' | 'delete' | 'certificate'; eventId: string }
  | { type: 'cancel'; registrationId: string }
  | { type: 'scan'; eventId: string; ticket: string }
  | { type: 'review'; eventId: string; rating: number; comment: string }
  | { type: 'save'; event: CampusEvent }
  | { type: 'profile'; name: string }
  | { type: 'role'; userId: string; organizer: boolean };

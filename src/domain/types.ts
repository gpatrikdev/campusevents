export type Role = 'organizer' | 'admin' | null;
export type Language = 'en' | 'hu';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileComplete: boolean;
}

export interface CampusEvent {
  id: string;
  title: string;
  location: string;
  start: string;
  end: string;
  timezone: string;
  content: string;
  status: 'draft' | 'published';
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  ticket: string;
  active: boolean;
  checkedIn: boolean;
  reviewed: boolean;
  certificate: 'none' | 'requested' | 'failed';
}

export interface Review {
  id: string;
  eventId: string;
  rating: number;
  comment: string;
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
}

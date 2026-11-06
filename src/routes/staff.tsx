import { createFileRoute, Outlet, retainSearchParams } from '@tanstack/react-router';
import { z } from 'zod';

const filters = ['filter', 'q', 'location', 'from', 'to', 'registration'] as const;

export const Route = createFileRoute('/staff')({
  component: Outlet,
  validateSearch: z.object({
    filter: z.enum(['all', 'draft', 'upcoming', 'ongoing', 'past']).optional().catch(undefined),
    q: z.string().optional().catch(undefined),
    location: z.string().optional().catch(undefined),
    from: z.iso.date().optional().catch(undefined),
    to: z.iso.date().optional().catch(undefined),
    registration: z.enum(['open', 'closed']).optional().catch(undefined),
  }),
  // Keeps the Events filters while staff open an event and come back.
  search: { middlewares: [retainSearchParams([...filters])] },
});

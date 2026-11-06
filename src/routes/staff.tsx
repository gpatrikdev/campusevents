import { createFileRoute, Outlet, retainSearchParams } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/staff')({
  component: Outlet,
  validateSearch: z.object({
    filter: z.enum(['draft', 'upcoming', 'ongoing', 'past']).optional().catch(undefined),
  }),
  search: { middlewares: [retainSearchParams(['filter'])] },
});

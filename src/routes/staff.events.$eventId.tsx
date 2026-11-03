import { createFileRoute, Outlet } from '@tanstack/react-router';
export const Route = createFileRoute('/staff/events/$eventId')({ component: Outlet });

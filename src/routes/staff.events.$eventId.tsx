import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { StaffEventLayout } from '../components/StaffEventLayout';

export const Route = createFileRoute('/staff/events/$eventId')({ component: Page });

function Page() {
  const { eventId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (/\/(edit|preview)\/?$/.test(pathname)) return <Outlet />;
  return <StaffEventLayout key={eventId} eventId={eventId} />;
}

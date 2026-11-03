import { createFileRoute } from '@tanstack/react-router';
import { StaffEventPage } from '../pages/StaffPages';

export const Route = createFileRoute('/staff/events/$eventId/')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <StaffEventPage eventId={eventId} />;
}

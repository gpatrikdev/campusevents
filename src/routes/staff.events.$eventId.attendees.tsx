import { createFileRoute } from '@tanstack/react-router';
import { AttendeesPage } from '../pages/AttendeesPage';

export const Route = createFileRoute('/staff/events/$eventId/attendees')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <AttendeesPage eventId={eventId} />;
}

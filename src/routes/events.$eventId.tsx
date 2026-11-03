import { createFileRoute } from '@tanstack/react-router';
import { EventDetailPage } from '../pages/EventDetailPage';

export const Route = createFileRoute('/events/$eventId')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <EventDetailPage eventId={eventId} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { EventDetailPage } from '../pages/EventDetailPage';

export const Route = createFileRoute('/staff/events/$eventId/preview')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <EventDetailPage eventId={eventId} preview />;
}

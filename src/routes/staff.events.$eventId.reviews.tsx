import { createFileRoute } from '@tanstack/react-router';
import { ReviewResultsPage } from '../pages/ReviewResultsPage';

export const Route = createFileRoute('/staff/events/$eventId/reviews')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <ReviewResultsPage eventId={eventId} />;
}

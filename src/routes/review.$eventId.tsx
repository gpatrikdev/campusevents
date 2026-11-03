import { createFileRoute } from '@tanstack/react-router';
import { ReviewPage } from '../pages/ReviewPage';

export const Route = createFileRoute('/review/$eventId')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <ReviewPage key={eventId} eventId={eventId} />;
}

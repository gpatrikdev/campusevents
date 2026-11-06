import { createFileRoute } from '@tanstack/react-router';
import { ReviewDetailPage } from '../pages/ReviewDetailPage';

export const Route = createFileRoute('/reviews/$eventId')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <ReviewDetailPage key={eventId} eventId={eventId} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { StatisticsPage } from '../pages/StatisticsPage';

export const Route = createFileRoute('/staff/events/$eventId/statistics')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <StatisticsPage eventId={eventId} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { ScannerPage } from '../pages/ScannerPage';

export const Route = createFileRoute('/staff/events/$eventId/scan')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <ScannerPage eventId={eventId} />;
}

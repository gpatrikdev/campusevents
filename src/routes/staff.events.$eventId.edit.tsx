import { createFileRoute } from '@tanstack/react-router';
import { EditorPage } from '../pages/EditorPage';

export const Route = createFileRoute('/staff/events/$eventId/edit')({ component: Page });
function Page() {
  const { eventId } = Route.useParams();
  return <EditorPage eventId={eventId} />;
}

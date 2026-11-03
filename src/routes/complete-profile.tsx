import { createFileRoute } from '@tanstack/react-router';
import { CompleteProfilePage, returnSearch } from '../pages/AuthPages';
export const Route = createFileRoute('/complete-profile')({
  validateSearch: returnSearch,
  component: Page,
});
function Page() {
  return <CompleteProfilePage {...Route.useSearch()} />;
}

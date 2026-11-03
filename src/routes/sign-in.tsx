import { createFileRoute } from '@tanstack/react-router';
import { returnSearch, SignInPage } from '../pages/AuthPages';
export const Route = createFileRoute('/sign-in')({ validateSearch: returnSearch, component: Page });
function Page() {
  return <SignInPage {...Route.useSearch()} />;
}

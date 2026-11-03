import { createFileRoute } from '@tanstack/react-router';
import SignInPage from '../app/login-card/page';
import { returnSearch } from '../pages/AuthPages';
export const Route = createFileRoute('/sign-in')({ validateSearch: returnSearch, component: Page });
function Page() {
  return <SignInPage {...Route.useSearch()} />;
}

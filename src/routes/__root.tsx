import { Button } from '@astryxdesign/core/Button';
import { createRootRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyNotice } from '../components/Feedback';
import { SiteShell } from '../components/SiteShell';

function NotFound() {
  const { t } = useTranslation();
  return (
    <EmptyNotice
      headingLevel={1}
      title={t('Page not found')}
      description={t('Check the address, or go back to the events list.')}
      actions={<Button href="/" label={t('Browse events')} />}
    />
  );
}
function ErrorPage() {
  const { t } = useTranslation();
  return (
    <EmptyNotice
      minHeight="100dvh"
      headingLevel={1}
      title={t('Something went wrong')}
      description={t('Reload the page to try again.')}
      actions={<Button label={t('Reload page')} onClick={() => window.location.reload()} />}
    />
  );
}

export const Route = createRootRoute({
  component: SiteShell,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { createRootRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyNotice } from '../components/Feedback';
import { SiteShell } from '../components/SiteShell';

function NotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      headingLevel={1}
      title={t('Page not found')}
      description={t('Choose a page from the main navigation.')}
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
      description={t('Reload this local preview to start again.')}
      actions={<Button label={t('Reload preview')} onClick={() => window.location.reload()} />}
    />
  );
}

export const Route = createRootRoute({
  component: SiteShell,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

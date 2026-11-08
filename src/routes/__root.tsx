import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/VStack';
import { createRootRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AppBrand } from '../components/FacultyLogo';
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
// Renders without the top bar, so it carries the faculty logo.
function ErrorPage() {
  const { t } = useTranslation();
  return (
    <VStack gap={2} hAlign="center" vAlign="center" minHeight="100dvh" padding={6}>
      <AppBrand />
      <EmptyNotice
        minHeight="0"
        headingLevel={1}
        title={t('Something went wrong')}
        description={t('Reload the page to try again.')}
        actions={<Button label={t('Reload page')} onClick={() => window.location.reload()} />}
      />
    </VStack>
  );
}

export const Route = createRootRoute({
  component: SiteShell,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

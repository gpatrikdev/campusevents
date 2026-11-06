import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { type ComponentProps, type ReactNode, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext, useApp } from '../api/context';
import { UserBlobatar } from './UserBlobatar';

/** The window height left under SiteShell's top nav (3rem) and content padding (6). */
export const belowNavHeight = 'calc(100dvh - var(--spacing-12) - 2 * var(--spacing-6))';

/** A roomy, centred notice topped with the signed-in user's blobatar. */
export function EmptyNotice({
  fallbackIcon,
  minHeight = '24rem',
  ...props
}: Omit<ComponentProps<typeof EmptyState>, 'icon'> & {
  fallbackIcon?: ReactNode;
  minHeight?: string;
}) {
  const user = useContext(AppContext)?.user;
  return (
    <VStack minHeight={minHeight} vAlign="center" hAlign="center" paddingBlock={10}>
      <EmptyState
        {...props}
        icon={user?.profileComplete ? <UserBlobatar name={user.name} /> : fallbackIcon}
      />
    </VStack>
  );
}

export function DataBoundary({
  children,
  pending = false,
  empty = false,
  emptyContent,
  title = 'No events in this view',
  description = 'Choose another filter or create a draft.',
}: {
  children: ReactNode;
  pending?: boolean;
  empty?: boolean;
  emptyContent?: ReactNode;
  title?: string;
  description?: string;
}) {
  const { t } = useTranslation();
  const { dataState, reload } = useApp();
  if (dataState === 'loading' || (dataState === 'ready' && pending))
    return (
      <VStack gap={4} role="status" aria-busy="true">
        <Text>{t('Loading…')}</Text>
        <Skeleton height="5rem" />
        <Skeleton height="5rem" />
        <Skeleton height="5rem" />
      </VStack>
    );
  if (dataState === 'error')
    return (
      <EmptyNotice
        fallbackIcon={<Icon icon="error" />}
        title={t('Data could not be loaded')}
        actions={<Button label={t('Try again')} onClick={reload} />}
      />
    );
  if (dataState === 'empty' || empty)
    return emptyContent ?? <EmptyNotice title={t(title)} description={t(description)} />;
  return children;
}

export function AccessNotice({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslation();
  return (
    <EmptyNotice
      minHeight={belowNavHeight}
      headingLevel={1}
      title={t('Access unavailable')}
      description={t(admin ? 'Admin access is required.' : 'Staff access is required.')}
    />
  );
}

export function UnavailableEvent() {
  const { t } = useTranslation();
  return (
    <EmptyNotice
      minHeight={belowNavHeight}
      headingLevel={1}
      title={t('This event is unavailable.')}
      description={t('It may be a staff-only draft or have been deleted.')}
    />
  );
}

/** Translates while it renders, so an open toast follows a language switch. */
function OutcomeMessage({ message }: { message: string }) {
  const { t } = useTranslation();
  return t(message);
}

/**
 * Shows each action's outcome as a toast, then clears the outcome. A success is
 * green (see app.css) and hides itself after five seconds. A failure stays until
 * it is dismissed, and so does a success with a warning, since that message
 * says where to find the ticket. A new toast replaces the one before it.
 */
export function OutcomeToast() {
  const { outcome, setOutcome } = useApp();
  const toast = useToast();
  useEffect(() => {
    if (!outcome) return;
    toast({
      body: <OutcomeMessage message={outcome.message} />,
      type: outcome.ok ? 'info' : 'error',
      isAutoHide: outcome.ok && !outcome.warning,
      uniqueID: 'outcome',
    });
    setOutcome(null);
  }, [outcome, setOutcome, toast]);
  return null;
}

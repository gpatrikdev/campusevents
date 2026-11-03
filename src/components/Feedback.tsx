import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMock } from '../mocks/hooks';
import { UserBlobatar } from './UserBlobatar';

/** A roomy, centred notice topped with the signed-in user's blobatar. */
export function EmptyNotice({
  fallbackIcon,
  minHeight = '24rem',
  ...props
}: Omit<ComponentProps<typeof EmptyState>, 'icon'> & {
  fallbackIcon?: ReactNode;
  minHeight?: string;
}) {
  const { user } = useMock();
  const compact = useMediaQuery('(max-width: 42rem)');
  return (
    <VStack minHeight={minHeight} vAlign="center" hAlign="center" paddingBlock={10}>
      <EmptyState
        {...props}
        icon={
          user?.profileComplete ? (
            <UserBlobatar name={user.name} size={compact ? 72 : 96} />
          ) : (
            fallbackIcon
          )
        }
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
  const { dataState, setDataState } = useMock();
  if (dataState === 'loading' || (dataState === 'ready' && pending))
    return (
      <VStack gap={4} role="status" aria-busy="true">
        <Text>{t('Loading sample data…')}</Text>
        <Skeleton height="5rem" />
        <Skeleton height="5rem" />
        <Skeleton height="5rem" />
      </VStack>
    );
  if (dataState === 'error')
    return (
      <EmptyState
        title={t('Sample data could not be loaded')}
        description={t('This is a simulated error. Try again to restore the ready state.')}
        icon={<Icon icon="error" />}
        actions={<Button label={t('Try again')} onClick={() => setDataState('ready')} />}
      />
    );
  if (dataState === 'empty' || empty)
    return emptyContent ?? <EmptyNotice title={t(title)} description={t(description)} />;
  return children;
}

export function AccessNotice({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      headingLevel={1}
      title={t('Access unavailable')}
      description={t(admin ? 'Admin access is required.' : 'Staff access is required.')}
      actions={
        <Text color="secondary">
          {t('Switch the demo identity in Preview controls to explore this screen.')}
        </Text>
      }
    />
  );
}

export function UnavailableEvent() {
  const { t } = useTranslation();
  return (
    <EmptyState
      headingLevel={1}
      title={t('This event is unavailable.')}
      description={t('It may be a staff-only draft or have been deleted.')}
    />
  );
}

export function OutcomeNotice() {
  const { t } = useTranslation();
  const { outcome, setOutcome } = useMock();
  if (!outcome) return null;
  return (
    <VStack role={outcome.ok ? 'status' : 'alert'} aria-live="polite">
      <Banner
        key={`${outcome.message}-${outcome.ok}`}
        status={outcome.ok ? 'success' : 'error'}
        title={t(outcome.message)}
        isDismissable
        onDismiss={() => setOutcome(null)}
      />
    </VStack>
  );
}

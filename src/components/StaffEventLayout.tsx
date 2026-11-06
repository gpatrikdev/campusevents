import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery, useOverflow } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { StackItem } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { HOUR, hasEnded, instant, isStaff, publishIssue, unpublishIssue } from '../domain/rules';
import { ConfirmDialog } from './ConfirmDialog';
import { DeleteIcon, EditIcon, QrCodeIcon, ReviewIcon } from './EventIcons';
import { AccessNotice, DataBoundary, EmptyNotice, UnavailableEvent } from './Feedback';
import { PeopleIcon } from './NavIcons';

const confirmations = {
  publish: {
    title: 'Publish this event?',
    description: 'Publication makes the event public and locks editing.',
    label: 'Publish event',
  },
  unpublish: {
    title: 'Return this event to draft?',
    description:
      'This clears all registrations and invalidates every ticket. Event content is kept.',
    label: 'Unpublish event',
  },
  delete: {
    title: 'Delete this event?',
    description:
      'This permanently removes the event, its registrations, reviews and certificate requests.',
    label: 'Delete event',
  },
};

export function StaffEventLayout({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const { data, user, now, run, dataState } = useApp();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const compact = useMediaQuery('(max-width: 42rem)');
  // The event actions stay in one row unless the row is wider than the header,
  // which depends on the language and the event's state as well as the screen.
  // A hidden copy of the row is measured, so the layout never flickers.
  const {
    containerRef: actionsRef,
    measureRef: actionsMeasureRef,
    hasOverflow: stacked,
  } = useOverflow(1, { behavior: 'observeParent' });
  const [action, setAction] = useState<keyof typeof confirmations | null>(null);
  const currentEvent = data.events.find((item) => item.id === eventId);
  // Keep the event identity visible while another task loads or fails.
  const knownEvent = useRef(currentEvent);
  useEffect(() => {
    if (currentEvent) knownEvent.current = currentEvent;
  }, [currentEvent]);
  if (!isStaff(user)) return <AccessNotice />;
  const event = currentEvent ?? (dataState !== 'ready' ? knownEvent.current : undefined);
  if (!event)
    return (
      <DataBoundary headingLevel={1} isPage>
        <UnavailableEvent />
      </DataBoundary>
    );
  const base = `/staff/events/${event.id}`;
  const tab = pathname.replace(/\/$/, '').slice(base.length + 1) || 'overview';
  const draft = event.status === 'draft';
  const publishBlocked = publishIssue(event, user, now);
  const unpublishBlocked = unpublishIssue(event, user, now);
  const scanning = !draft && now >= instant(event.start) - HOUR && !hasEnded(event, now);
  const ready = dataState === 'ready';
  const confirmation = confirmations[action ?? 'publish'];
  const publicationIssue = draft ? publishBlocked : unpublishBlocked;
  const pageLabel = t(draft ? 'Preview event' : 'Public page');
  const pageHref = draft ? `${base}/preview` : `/events/${event.id}`;
  const pageIcon = <Icon icon="externalLink" />;
  const actionGroup = (isStacked: boolean) => (
    <ButtonGroup label={t('Event actions')} orientation={isStacked ? 'vertical' : 'horizontal'}>
      <Button
        label={t(draft ? 'Publish event' : 'Unpublish event')}
        icon={<Icon icon={draft ? 'check' : 'eyeSlash'} />}
        variant="secondary"
        isDisabled={!ready || !!publicationIssue}
        onClick={() => setAction(draft ? 'publish' : 'unpublish')}
      />
      {draft && (
        <Button
          label={t('Edit draft')}
          href={`${base}/edit`}
          icon={<Icon icon={EditIcon} />}
          variant="secondary"
        />
      )}
      <Button
        label={t('Delete event')}
        icon={<Icon icon={DeleteIcon} />}
        variant="destructive"
        isDisabled={!ready}
        onClick={() => setAction('delete')}
      />
      {/* A stacked group shows the label, since a row holding only an icon
          reads as a stray button there. */}
      {isStacked ? (
        <Button label={pageLabel} href={pageHref} icon={pageIcon} variant="secondary" />
      ) : (
        <IconButton
          label={pageLabel}
          tooltip={pageLabel}
          href={pageHref}
          icon={pageIcon}
          variant="secondary"
        />
      )}
    </ButtonGroup>
  );
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider paddingBlockEnd={0}>
          <VStack gap={5}>
            <Breadcrumbs variant="supporting" label={t('Event navigation')}>
              <BreadcrumbItem href="/staff">{t('Events')}</BreadcrumbItem>
              <BreadcrumbItem isCurrent>
                <VStack maxWidth={compact ? '12rem' : '32rem'}>
                  <Text type="inherit" maxLines={1}>
                    {event.title}
                  </Text>
                </VStack>
              </BreadcrumbItem>
            </Breadcrumbs>
            {/* The actions sit beside the title while both fit on one line and
                move under it otherwise, so a long title or the longer Hungarian
                labels never squeeze the title. On phones the title takes the
                whole line, so the actions always go under it. The actions
                stack only when even a line of their own is too narrow. */}
            <HStack gap={4} vAlign="start" wrap="wrap">
              <StackItem size="fill" style={compact ? { flexBasis: '100%' } : undefined}>
                <VStack gap={3}>
                  <Heading level={1}>{event.title}</Heading>
                  <HStack>
                    <Badge
                      label={t(draft ? 'Draft' : 'Published')}
                      variant={draft ? 'neutral' : 'green'}
                    />
                  </HStack>
                </VStack>
              </StackItem>
              <HStack ref={actionsRef} gap={4} wrap="wrap" vAlign="start">
                {scanning && tab !== 'scan' && (
                  <Button
                    label={t('Scan QR tickets')}
                    href={`${base}/scan`}
                    variant="primary"
                    icon={<Icon icon={QrCodeIcon} />}
                  />
                )}
                {actionGroup(stacked)}
                <HStack ref={actionsMeasureRef} className="actions-measure" aria-hidden inert>
                  {actionGroup(false)}
                </HStack>
              </HStack>
            </HStack>
            <TabList value={tab} onChange={() => {}} isFullBleed aria-label={t('Manage event')}>
              <Tab
                value="overview"
                label={t('Overview')}
                href={base}
                icon={<Icon icon="calendar" />}
              />
              <Tab
                value="attendees"
                label={t('Attendees')}
                href={`${base}/attendees`}
                icon={<Icon icon={PeopleIcon} />}
              />
              <Tab
                value="scan"
                label={t('QR scanner')}
                href={`${base}/scan`}
                icon={<Icon icon={QrCodeIcon} />}
              />
              <Tab
                value="reviews"
                label={t('Review results')}
                href={`${base}/reviews`}
                icon={<Icon icon={ReviewIcon} />}
              />
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={compact ? 4 : 6} isScrollable={false}>
          <VStack gap={6}>
            {/* Says what the status means and, when Publish or Unpublish is
                greyed out, why. The key brings a dismissed banner back once
                the status changes. */}
            {tab === 'overview' && (
              <Banner
                key={`${event.id}-${event.status}`}
                status="info"
                title={t(
                  draft ? 'Drafts are visible to staff only.' : 'Published details are locked.',
                )}
                description={t(
                  publicationIssue ??
                    (draft
                      ? 'Publish a draft more than 24 hours before it starts.'
                      : 'Unpublish before the start to edit.'),
                )}
                isDismissable
              />
            )}
            <DataBoundary
              headingLevel={2}
              emptyContent={
                <EmptyNotice
                  headingLevel={2}
                  title={t('This event is unavailable.')}
                  description={t('It may be a staff-only draft or have been deleted.')}
                  isBoxed
                />
              }
            >
              <Outlet />
            </DataBoundary>
          </VStack>
        </LayoutContent>
      }
      footer={
        <ConfirmDialog
          isOpen={!!action}
          onOpenChange={(open) => {
            if (!open) setAction(null);
          }}
          {...confirmation}
          destructive={action === 'delete' || action === 'unpublish'}
          onConfirm={async () => {
            if (!action) return;
            const result = await run({ type: action, eventId: event.id });
            if (result.ok && action === 'delete') void navigate({ to: '/staff' });
          }}
        />
      }
    />
  );
}

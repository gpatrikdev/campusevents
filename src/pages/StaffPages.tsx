import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EventRow } from '../components/EventRow';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { formatDate } from '../domain/format';
import { hasEnded, instant, isStaff, publishIssue, unpublishIssue } from '../domain/rules';
import { useEvents, useMock } from '../mocks/hooks';

export function StaffPage() {
  const { t } = useTranslation();
  const { user, now } = useMock();
  const query = useEvents();
  const [filter, setFilter] = useState('upcoming');
  if (!isStaff(user)) return <AccessNotice />;
  const events = (query.data ?? [])
    .filter((event) =>
      filter === 'draft'
        ? event.status === 'draft'
        : event.status === 'published' &&
          (filter === 'past' ? hasEnded(event, now) : !hasEnded(event, now)),
    )
    .sort((a, b) =>
      filter === 'past' ? instant(b.start) - instant(a.start) : instant(a.start) - instant(b.start),
    );
  return (
    <VStack gap={6}>
      <HStack hAlign="between" gap={6} wrap="wrap" vAlign="center">
        <VStack gap={3}>
          <Heading level={1}>{t('Manage university events')}</Heading>
          <Text color="secondary">{t('All organizers and admins can manage every event.')}</Text>
        </VStack>
        <Button label={t('Create draft')} href="/staff/events/new" variant="primary" />
      </HStack>
      <TabList
        role="tablist"
        value={filter}
        onChange={setFilter}
        hasDivider
        aria-label={t('Event filters')}
      >
        <Tab value="draft" label={t('Draft')} panelId="staff-events" />
        <Tab value="upcoming" label={t('Upcoming')} panelId="staff-events" />
        <Tab value="past" label={t('Past')} panelId="staff-events" />
      </TabList>
      <VStack
        as="section"
        role="tabpanel"
        id="staff-events"
        aria-label={t(filter === 'draft' ? 'Draft' : filter === 'past' ? 'Past' : 'Upcoming')}
      >
        <DataBoundary empty={!query.isPending && events.length === 0}>
          {events.map((event) => (
            <VStack key={event.id} gap={0}>
              <EventRow event={event} staff />
              <Divider />
            </VStack>
          ))}
        </DataBoundary>
      </VStack>
    </VStack>
  );
}

const confirmations = {
  publish: {
    title: 'Publish this event?',
    description: 'Publication locks event editing. This change affects only the local preview.',
    label: 'Publish event',
  },
  unpublish: {
    title: 'Return this event to draft?',
    description:
      'This clears all registrations and invalidates every demo ticket. Event content is kept.',
    label: 'Unpublish event',
  },
  delete: {
    title: 'Delete this event?',
    description:
      'This removes the event, tickets, reviews and certificate requests from this preview. No notification will be sent.',
    label: 'Delete event',
  },
};

export function StaffEventPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run } = useMock();
  const [action, setAction] = useState<keyof typeof confirmations | null>(null);
  const navigate = useNavigate();
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  const issue =
    event.status === 'draft' ? publishIssue(event, user, now) : unpublishIssue(event, user, now);
  const confirmation = action ? confirmations[action] : confirmations.publish;
  return (
    <DataBoundary>
      <VStack gap={8}>
        <VStack gap={4}>
          <HStack gap={3}>
            <Badge label={t(event.status === 'draft' ? 'Draft' : 'Published')} />
          </HStack>
          <Heading level={1}>{event.title}</Heading>
          <MetadataList orientation="horizontal">
            <MetadataListItem label={t('Date and time')}>
              {formatDate(event.start, event.timezone, i18n.language)} –{' '}
              {formatDate(event.end, event.timezone, i18n.language)}
            </MetadataListItem>
            <MetadataListItem label={t('Timezone')}>{event.timezone}</MetadataListItem>
            <MetadataListItem label={t('Location')}>{event.location}</MetadataListItem>
          </MetadataList>
        </VStack>
        <VStack gap={5}>
          <Heading level={2}>{t('Manage event')}</Heading>
          <HStack gap={3} wrap="wrap">
            {event.status === 'draft' ? (
              <>
                <Button
                  label={t('Edit draft')}
                  href={`/staff/events/${event.id}/edit`}
                  variant="primary"
                />
                <Button label={t('Preview event')} href={`/staff/events/${event.id}/preview`} />
              </>
            ) : (
              <Button label={t('Open public page')} href={`/events/${event.id}`} />
            )}
          </HStack>
          {event.status === 'published' && (
            <Text type="supporting">
              {t('Published details are locked. Unpublish before the start to edit.')}
            </Text>
          )}
          <HStack gap={3} wrap="wrap">
            <Button label={t('Attendees')} href={`/staff/events/${event.id}/attendees`} />
            <Button label={t('Scan QR tickets')} href={`/staff/events/${event.id}/scan`} />
            <Button label={t('Review results')} href={`/staff/events/${event.id}/reviews`} />
          </HStack>
        </VStack>
        <Divider />
        <VStack gap={4}>
          <HStack gap={3} wrap="wrap">
            <Button
              label={t(event.status === 'draft' ? 'Publish event' : 'Unpublish event')}
              isDisabled={!!issue}
              onClick={() => setAction(event.status === 'draft' ? 'publish' : 'unpublish')}
            />
            <Button
              label={t('Delete event')}
              variant="destructive"
              onClick={() => setAction('delete')}
            />
          </HStack>
          {issue && <Text type="supporting">{t(issue)}</Text>}
        </VStack>
        <ConfirmDialog
          isOpen={!!action}
          onOpenChange={(open) => {
            if (!open) setAction(null);
          }}
          {...confirmation}
          destructive={action === 'delete' || action === 'unpublish'}
          onConfirm={() => {
            if (!action) return;
            const result = run({ type: action, eventId: event.id });
            if (result.ok && action === 'delete') void navigate({ to: '/staff' });
          }}
        />
      </VStack>
    </DataBoundary>
  );
}

import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Selector } from '@astryxdesign/core/Selector';
import { proportional, Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { RichTextView } from '@astryxdesign/richtext';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { EventDetails } from '../components/EventDetails';
import { PlusIcon } from '../components/EventIcons';
import { BannerImage, richTextNodes } from '../components/EventImage';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { formatDateRange } from '../domain/format';
import { hasEnded, instant, isStaff, registrationCutoff } from '../domain/rules';

export function StaffPage() {
  const { t, i18n } = useTranslation();
  const { user, now, data } = useApp();
  const { filter = 'upcoming' } = useSearch({ from: '/staff' });
  const navigate = useNavigate({ from: '/staff/' });
  const compact = useMediaQuery('(max-width: 42rem)');
  if (!isStaff(user)) return <AccessNotice />;
  const label = t(
    filter === 'draft'
      ? 'Draft'
      : filter === 'past'
        ? 'Past'
        : filter === 'ongoing'
          ? 'Ongoing'
          : 'Upcoming',
  );
  const showRegistration = filter === 'upcoming' || filter === 'ongoing';
  const events = data.events
    .filter((event) => {
      if (filter === 'draft') return event.status === 'draft';
      if (event.status !== 'published') return false;
      if (filter === 'past') return hasEnded(event, now);
      if (filter === 'ongoing') return now >= instant(event.start) && !hasEnded(event, now);
      return now < instant(event.start);
    })
    .sort((a, b) =>
      filter === 'past' ? instant(b.start) - instant(a.start) : instant(a.start) - instant(b.start),
    );
  // Table rows must be plain objects, so copy what the columns show.
  const rows = events.map((event) => ({
    id: event.id,
    title: event.title,
    dates: formatDateRange(event.start, event.end, event.timezone, i18n.language),
    timezone: event.timezone,
    location: event.location,
    closed: now >= registrationCutoff(event),
  }));
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={3}>
            <HStack hAlign="between" gap={4} wrap="wrap" vAlign="center">
              <Heading level={1}>{t('Events')}</Heading>
              <Button
                label={t('Create draft')}
                href="/staff/events/new"
                variant="primary"
                icon={<Icon icon={PlusIcon} />}
              />
            </HStack>
            <Text color="secondary">
              {t('Create and publish events, then manage their attendees and check-in.')}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable={false}>
          <VStack gap={6}>
            <Banner
              status="info"
              title={t('Drafts are visible to staff only.')}
              description={t('Publish a draft more than 24 hours before it starts.')}
              isDismissable
            />
            {/* A filter bar. Later filters go beside this one, and the row wraps
                onto a second line on phones. */}
            <HStack gap={4} wrap="wrap" vAlign="end" role="group" aria-label={t('Event filters')}>
              <Selector
                label={t('Status')}
                startIcon="funnel"
                width="12rem"
                value={filter}
                options={[
                  { value: 'draft', label: t('Draft') },
                  { value: 'upcoming', label: t('Upcoming') },
                  { value: 'ongoing', label: t('Ongoing') },
                  { value: 'past', label: t('Past') },
                ]}
                onChange={(value) => {
                  if (
                    value === 'draft' ||
                    value === 'upcoming' ||
                    value === 'ongoing' ||
                    value === 'past'
                  )
                    void navigate({ search: { filter: value }, replace: true, resetScroll: false });
                }}
              />
            </HStack>
            <DataBoundary empty={events.length === 0} headingLevel={2}>
              {/* The column floors are wider than a phone, so there the table
                    scrolls sideways inside its card. */}
              <Card>
                <Table
                  data={rows}
                  idKey="id"
                  hasHover
                  textOverflow="truncate"
                  aria-label={label}
                  columns={[
                    {
                      key: 'title',
                      header: t('Event title'),
                      width: proportional(5, { minWidth: 180 }),
                      renderCell: (event) => (
                        <Link
                          href={`/staff/events/${event.id}`}
                          weight="semibold"
                          color="primary"
                          isStandalone
                          maxLines={1}
                        >
                          {event.title}
                        </Link>
                      ),
                    },
                    {
                      key: 'dates',
                      header: t('Date and time'),
                      width: proportional(4, { minWidth: 180 }),
                    },
                    {
                      key: 'timezone',
                      header: t('Timezone'),
                      width: proportional(3, { minWidth: 130 }),
                      renderCell: (event) => (
                        <Text type="inherit" color="secondary" maxLines={1}>
                          {event.timezone}
                        </Text>
                      ),
                    },
                    {
                      key: 'location',
                      header: t('Location'),
                      width: proportional(4, { minWidth: 150 }),
                    },
                    ...(showRegistration
                      ? [
                          {
                            key: 'closed' as const,
                            header: t('Registration status'),
                            width: proportional(3, { minWidth: 140 }),
                            renderCell: (event: (typeof rows)[number]) => (
                              <Badge
                                label={t(event.closed ? 'Closed' : 'Open')}
                                variant={event.closed ? 'neutral' : 'green'}
                              />
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </Card>
            </DataBoundary>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export function StaffEventPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const { data, user } = useApp();
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  return (
    <VStack gap={6}>
      <Heading level={2}>{t('Event details')}</Heading>
      {event.banner && <BannerImage id={event.banner} />}
      <EventDetails event={event} />
      <Divider />
      <VStack as="section" gap={4} className="event-description">
        <Heading level={3}>{t('About this event')}</Heading>
        <RichTextView value={event.content} nodes={richTextNodes} />
      </VStack>
    </VStack>
  );
}

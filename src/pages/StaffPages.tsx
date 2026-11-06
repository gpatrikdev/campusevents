import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Card } from '@astryxdesign/core/Card';
import { DateRangeInput } from '@astryxdesign/core/DateRangeInput';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Selector } from '@astryxdesign/core/Selector';
import { proportional, Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { RichTextView } from '@astryxdesign/richtext';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { EventDetails } from '../components/EventDetails';
import { LocationIcon, PlusIcon, TicketIcon } from '../components/EventIcons';
import { BannerImage, richTextNodes } from '../components/EventImage';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { formatDateRange } from '../domain/format';
import { isStaff, registrationCutoff } from '../domain/rules';
import { eventPhase, filterStaffEvents } from '../domain/staffEvents';

export function StaffPage() {
  const { t, i18n } = useTranslation();
  const { user, now, data } = useApp();
  const search = useSearch({ from: '/staff' });
  const { filter = 'upcoming', q, location, from, to } = search;
  const navigate = useNavigate({ from: '/staff/' });
  const compact = useMediaQuery('(max-width: 42rem)');
  // The search field keeps its own text. The URL updates a moment after each key, and
  // reading the field from it would move the cursor to the end while typing.
  const [title, setTitle] = useState(q ?? '');
  if (!isStaff(user)) return <AccessNotice />;
  const { registration } = search;
  const range = from && to ? { start: from as ISODateString, end: to as ISODateString } : null;
  const isFiltered = Boolean(title.trim() || location || range || registration);
  // Keys set to undefined are removed. Keys left out keep their current value.
  const setFilters = (next: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
  const others = { status: filter, title, range: range ?? undefined, registration };
  // Offer only the locations the other filters leave events at.
  const locations = new Set(
    filterStaffEvents(data.events, others, now, i18n.language).map((event) => event.location),
  );
  // A chosen location stays listed after other filters rule it out, so it still shows as selected.
  if (location) locations.add(location);
  const statuses = [
    { value: 'all', label: t('All') },
    { value: 'draft', label: t('Draft') },
    { value: 'upcoming', label: t('Upcoming') },
    { value: 'ongoing', label: t('Ongoing') },
    { value: 'past', label: t('Past') },
  ] as const;
  const statusLabel = (value: string) =>
    statuses.find((status) => status.value === value)?.label ?? '';
  const events = filterStaffEvents(data.events, { ...others, location }, now, i18n.language);
  // Table rows must be plain objects, so copy what the columns show.
  const rows = events.map((event) => ({
    id: event.id,
    title: event.title,
    dates: formatDateRange(event.start, event.end, event.timezone, i18n.language),
    timezone: event.timezone,
    location: event.location,
    closed: now >= registrationCutoff(event),
    phase: eventPhase(event, now),
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
            <VStack role="group" aria-label={t('Event filters')} gap={2}>
              {/* Always shown, so the filters don't move down when the first one is set. */}
              <HStack hAlign="end">
                <Button
                  label={t('Clear filters')}
                  variant="secondary"
                  size="sm"
                  icon={<Icon icon="close" />}
                  isDisabled={!isFiltered}
                  onClick={() => {
                    setTitle('');
                    setFilters({
                      q: undefined,
                      location: undefined,
                      from: undefined,
                      to: undefined,
                      registration: undefined,
                    });
                  }}
                />
              </HStack>
              {/* Equal columns, three across on desktop and fewer on narrower screens. */}
              <Grid columns={{ minWidth: 200, max: 3 }} gap={4} align="end">
                <TextInput
                  label={t('Search events')}
                  type="search"
                  startIcon="search"
                  placeholder={t('Search by title')}
                  width="100%"
                  value={title}
                  onChange={(value) => {
                    setTitle(value);
                    setFilters({ q: value || undefined });
                  }}
                  hasClear
                />
                <Selector
                  label={t('Status')}
                  startIcon="funnel"
                  width="100%"
                  value={filter}
                  options={[...statuses]}
                  onChange={(value) => {
                    const status = statuses.find((item) => item.value === value)?.value;
                    if (status) setFilters({ filter: status });
                  }}
                />
                {/* British and Hungarian calendars start the week on Monday. */}
                <DateRangeInput
                  label={t('Dates')}
                  placeholder={t('Any date')}
                  width="100%"
                  numberOfMonths={compact ? 1 : 2}
                  weekStartsOn="mon"
                  value={range}
                  onChange={(value) => setFilters({ from: value?.start, to: value?.end })}
                />
                <Selector
                  label={t('Location')}
                  startIcon={LocationIcon}
                  placeholder={t('All locations')}
                  width="100%"
                  value={location ?? null}
                  options={[...locations].sort((a, b) => a.localeCompare(b, i18n.language))}
                  onChange={(value: string | null) => setFilters({ location: value ?? undefined })}
                  hasSearch
                  hasClear
                />
                <Selector
                  label={t('Registration')}
                  startIcon={TicketIcon}
                  width="100%"
                  value={registration ?? 'all'}
                  options={[
                    { value: 'all', label: t('Open or closed') },
                    { value: 'open', label: t('Open') },
                    { value: 'closed', label: t('Closed') },
                  ]}
                  onChange={(value) =>
                    setFilters({
                      registration: value === 'open' || value === 'closed' ? value : undefined,
                    })
                  }
                />
              </Grid>
            </VStack>
            <DataBoundary
              empty={events.length === 0}
              headingLevel={2}
              {...(isFiltered && {
                title: 'No events match these filters',
                description: 'Change or clear the filters to see more events.',
              })}
            >
              {/* The column floors are wider than a phone, so there the table
                    scrolls sideways inside its card. */}
              <Card>
                <Table
                  data={rows}
                  idKey="id"
                  hasHover
                  textOverflow="truncate"
                  aria-label={statusLabel(filter)}
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
                    {
                      key: 'phase',
                      header: t('Status'),
                      width: proportional(3, { minWidth: 120 }),
                      renderCell: (event) => (
                        <Badge
                          label={statusLabel(event.phase)}
                          variant={
                            event.phase === 'upcoming'
                              ? 'green'
                              : event.phase === 'ongoing'
                                ? 'blue'
                                : 'neutral'
                          }
                        />
                      ),
                    },
                    {
                      key: 'closed',
                      header: t('Registration status'),
                      width: proportional(3, { minWidth: 140 }),
                      // Drafts take no registrations. Plain text keeps them apart from Closed.
                      renderCell: (event) =>
                        event.phase === 'draft' ? (
                          <Text type="inherit" color="secondary" maxLines={1}>
                            {t('Not applicable')}
                          </Text>
                        ) : (
                          <Badge
                            label={t(event.closed ? 'Closed' : 'Open')}
                            variant={event.closed ? 'neutral' : 'green'}
                          />
                        ),
                    },
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

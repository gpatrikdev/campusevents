import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { InfoTip } from '@astryxdesign/core/InfoTip';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Section } from '@astryxdesign/core/Section';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { RichTextView } from '@astryxdesign/richtext';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { LocationIcon } from '../components/EventIcons';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { formatDate, formatDateRange } from '../domain/format';
import { hasEnded, instant, isStaff, registrationCutoff } from '../domain/rules';

export function StaffPage() {
  const { t, i18n } = useTranslation();
  const { user, now, data } = useApp();
  const { filter = 'upcoming' } = useSearch({ from: '/staff' });
  const navigate = useNavigate({ from: '/staff/' });
  const compact = useMediaQuery('(max-width: 42rem)');
  const list = useMediaQuery('(max-width: 64rem)');
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
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider paddingBlockEnd={0}>
          <VStack gap={6}>
            <HStack hAlign="between" gap={4} wrap="wrap" vAlign="center">
              <Heading level={1}>{t('Events')}</Heading>
              <Button label={t('Create draft')} href="/staff/events/new" variant="primary" />
            </HStack>
            <TabList
              role="tablist"
              value={filter}
              onChange={(value) => {
                if (
                  value === 'draft' ||
                  value === 'upcoming' ||
                  value === 'ongoing' ||
                  value === 'past'
                )
                  void navigate({ search: { filter: value }, replace: true, resetScroll: false });
              }}
              aria-label={t('Event filters')}
              isFullBleed
            >
              <Tab value="draft" label={t('Draft')} panelId="staff-events" />
              <Tab value="upcoming" label={t('Upcoming')} panelId="staff-events" />
              <Tab value="ongoing" label={t('Ongoing')} panelId="staff-events" />
              <Tab value="past" label={t('Past')} panelId="staff-events" />
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable={false}>
          <Section padding={compact ? 4 : 6}>
            <VStack role="tabpanel" id="staff-events" aria-label={label} gap={0}>
              <DataBoundary empty={events.length === 0} headingLevel={2}>
                {list ? (
                  <List hasDividers edge="outset" density="balanced" aria-label={label}>
                    {events.map((event) => (
                      <ListItem
                        key={event.id}
                        href={`/staff/events/${event.id}`}
                        label={<Text weight="semibold">{event.title}</Text>}
                        description={
                          <VStack gap={1} paddingBlockStart={2}>
                            <Text>
                              {formatDateRange(
                                event.start,
                                event.end,
                                event.timezone,
                                i18n.language,
                              )}
                            </Text>
                            <Text color="secondary">{event.timezone}</Text>
                            <Text color="secondary">{event.location}</Text>
                            {showRegistration && (
                              <HStack>
                                <Badge
                                  label={t(now >= registrationCutoff(event) ? 'Closed' : 'Open')}
                                  variant={now >= registrationCutoff(event) ? 'neutral' : 'green'}
                                />
                              </HStack>
                            )}
                          </VStack>
                        }
                      />
                    ))}
                  </List>
                ) : (
                  <VStack gap={0} className="staff-events-table">
                    <Card>
                      <Table
                        density="balanced"
                        dividers="rows"
                        textOverflow="truncate"
                        hasHover
                        aria-label={label}
                      >
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>{t('Event title')}</TableHeaderCell>
                            <TableHeaderCell>{t('Date and time')}</TableHeaderCell>
                            <TableHeaderCell>{t('Timezone')}</TableHeaderCell>
                            <TableHeaderCell>{t('Location')}</TableHeaderCell>
                            {showRegistration && (
                              <TableHeaderCell>{t('Registration status')}</TableHeaderCell>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell>
                                <Link
                                  href={`/staff/events/${event.id}`}
                                  weight="semibold"
                                  color="primary"
                                  isStandalone
                                  maxLines={1}
                                >
                                  {event.title}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Text maxLines={1}>
                                  {formatDateRange(
                                    event.start,
                                    event.end,
                                    event.timezone,
                                    i18n.language,
                                  )}
                                </Text>
                              </TableCell>
                              <TableCell>
                                <Text maxLines={1} color="secondary">
                                  {event.timezone}
                                </Text>
                              </TableCell>
                              <TableCell>
                                <Text maxLines={1}>{event.location}</Text>
                              </TableCell>
                              {showRegistration && (
                                <TableCell>
                                  <Badge
                                    label={t(now >= registrationCutoff(event) ? 'Closed' : 'Open')}
                                    variant={now >= registrationCutoff(event) ? 'neutral' : 'green'}
                                  />
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </VStack>
                )}
              </DataBoundary>
            </VStack>
          </Section>
        </LayoutContent>
      }
    />
  );
}

export function StaffEventPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  return (
    <VStack gap={6}>
      <Heading level={2}>{t('Event details')}</Heading>
      <Grid columns={{ minWidth: 280, max: 2 }} gap={8}>
        <VStack as="section" gap={4}>
          <HStack gap={2} vAlign="center">
            <Icon icon="calendar" color="secondary" />
            <Heading level={3}>{t('Date and time')}</Heading>
            <InfoTip
              label={t('About event times')}
              content={t('Times are shown in the event’s timezone.')}
            />
          </HStack>
          <MetadataList label={{ position: compact ? 'top' : 'start', width: '7rem' }}>
            <MetadataListItem label={t('Starts at')}>
              {formatDate(event.start, event.timezone, i18n.language)}
            </MetadataListItem>
            <MetadataListItem label={t('Ends at')}>
              {formatDate(event.end, event.timezone, i18n.language)}
            </MetadataListItem>
            <MetadataListItem label={t('Timezone')}>{event.timezone}</MetadataListItem>
          </MetadataList>
        </VStack>
        <VStack as="section" gap={4}>
          <HStack gap={2} vAlign="center">
            <Icon icon={LocationIcon} color="secondary" />
            <Heading level={3}>{t('Location')}</Heading>
          </HStack>
          <Text>{event.location}</Text>
        </VStack>
      </Grid>
      <Divider />
      <VStack as="section" gap={4} className="event-description">
        <Heading level={3}>{t('About this event')}</Heading>
        <RichTextView value={event.content} />
      </VStack>
    </VStack>
  );
}

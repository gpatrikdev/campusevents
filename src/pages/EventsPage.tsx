import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DataBoundary, EmptyNotice } from '../components/Feedback';
import { UserBlobatar } from '../components/UserBlobatar';
import { formatDate, formatDateRange } from '../domain/format';
import { instant, registrationCutoff } from '../domain/rules';
import type { CampusEvent } from '../domain/types';
import { useEvents, useMock } from '../mocks/hooks';

export function EventsPage() {
  const { t } = useTranslation();
  const { now, user } = useMock();
  const query = useEvents();
  const narrow = useMediaQuery('(max-width: 56rem)');
  const compact = useMediaQuery('(max-width: 42rem)');
  const events = (query.data ?? [])
    .filter((event) => event.status === 'published' && instant(event.end) > now)
    .sort((a, b) => instant(a.start) - instant(b.start));
  const guidance = (
    <Section variant="muted" padding={6}>
      <VStack gap={4}>
        <Heading level={2}>{t('Before you join')}</Heading>
        <Text as="p">{t('Everyone is welcome. A university email address is not required.')}</Text>
        <Text as="p">
          {t('Registration and cancellation close 24 hours before an event starts.')}
        </Text>
        <Text as="p" color="secondary">
          {t('Your QR ticket is available under Registrations.')}
        </Text>
      </VStack>
    </Section>
  );
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={3} paddingBlockStart={compact ? 4 : 0} paddingBlockEnd={4}>
            <HStack gap={4} vAlign="center" hAlign="between">
              <Heading level={1} type={compact ? 'display-3' : 'display-2'}>
                {t('University events')}
              </Heading>
              {user?.profileComplete && <UserBlobatar name={user.name} />}
            </HStack>
            <Text as="p" type="large" color="secondary" weight="normal">
              {t('Lectures, workshops and conversations across the university.')}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable={false}>
          <VStack gap={8}>
            <Section variant="transparent" padding={compact ? 4 : 6}>
              <DataBoundary
                pending={query.isPending}
                empty={events.length === 0}
                emptyContent={
                  <EmptyNotice
                    headingLevel={2}
                    fallbackIcon={<Icon icon="calendar" size="lg" />}
                    title={t('No upcoming events')}
                    description={t('Published events will appear here.')}
                  />
                }
              >
                <List
                  header={<Heading level={2}>{t('Upcoming and ongoing')}</Heading>}
                  density="spacious"
                  edge="outset"
                  hasDividers
                >
                  {events.map((event) => (
                    <PublicEventListItem key={event.id} event={event} now={now} compact={compact} />
                  ))}
                </List>
              </DataBoundary>
            </Section>
            {narrow && guidance}
          </VStack>
        </LayoutContent>
      }
      end={
        !narrow && (
          <LayoutPanel width="18rem" padding={6} hasDivider isScrollable={false}>
            {guidance}
          </LayoutPanel>
        )
      }
    />
  );
}

function PublicEventListItem({
  event,
  now,
  compact,
}: {
  event: CampusEvent;
  now: number;
  compact: boolean;
}) {
  const { t, i18n } = useTranslation();
  const link = useRef<HTMLAnchorElement>(null);
  const ongoing = now >= instant(event.start);
  const closed = now >= registrationCutoff(event);
  const status = t(closed ? 'Registration closed' : 'Registration open');
  const registration = (
    <HStack gap={2} vAlign="center">
      <HStack aria-hidden="true">
        <StatusDot variant={closed ? 'neutral' : 'success'} label={status} />
      </HStack>
      <Text type="supporting" weight="medium">
        {status}
      </Text>
    </HStack>
  );
  const live = ongoing && (
    <HStack className="live-now">
      <Text type="supporting" weight="semibold" color="inherit">
        {t('Happening now')}
      </Text>
    </HStack>
  );
  return (
    <ListItem
      interactiveRef={link}
      align="start"
      startContent={
        !compact && (
          <VStack gap={1} width="7.5rem">
            <Text weight="semibold">
              {formatDate(event.start, event.timezone, i18n.language, false)}
            </Text>
            {live}
          </VStack>
        )
      }
      label={
        <Link ref={link} href={`/events/${event.id}`} size="lg" color="primary" weight="semibold">
          {event.title}
        </Link>
      }
      description={
        <VStack gap={1} paddingBlockStart={1}>
          <Text color="secondary">
            {formatDateRange(event.start, event.end, event.timezone, i18n.language, compact)}
          </Text>
          <Text color="secondary">{event.location}</Text>
          <Text type="supporting">{event.timezone}</Text>
          {compact && (
            <HStack gap={3} wrap="wrap" vAlign="center" paddingBlockStart={1}>
              {live}
              {registration}
            </HStack>
          )}
        </VStack>
      }
      endContent={
        <HStack gap={3} vAlign="center">
          {!compact && registration}
          <Icon icon="chevronRight" color="secondary" size="sm" />
        </HStack>
      }
    />
  );
}

import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import { List } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { EventListItem } from '../components/EventListItem';
import { DataBoundary, EmptyNotice } from '../components/Feedback';
import { UserBlobatar } from '../components/UserBlobatar';
import { instant, registrationCutoff } from '../domain/rules';
import type { CampusEvent } from '../domain/types';

export function EventsPage() {
  const { t } = useTranslation();
  const { now, user, data, dataState } = useApp();
  const narrow = useMediaQuery('(max-width: 56rem)');
  const compact = useMediaQuery('(max-width: 42rem)');
  const events = data.events
    .filter((event) => event.status === 'published' && instant(event.end) > now)
    .sort((a, b) => instant(a.start) - instant(b.start));
  // Wide screens show the side panel, and the blob sits on its top corner.
  const cornerBlob = !narrow && user?.profileComplete;
  const guidance = (
    <Section variant="muted" padding={6}>
      {cornerBlob && (
        <VStack className="corner-blob">
          <UserBlobatar name={user.name} />
        </VStack>
      )}
      <VStack gap={4}>
        <Heading level={2}>{t('Before you join')}</Heading>
        <Text as="p">{t('Everyone is welcome. A university email address is not required.')}</Text>
        <Text as="p">
          {t('Registration and cancellation close 24 hours before an event starts.')}
        </Text>
        <Text as="p" color="secondary">
          {t('Open an event from Registrations to view your QR ticket.')}
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
            <Heading level={1} type={compact ? 'display-3' : 'display-2'}>
              {t('University events')}
            </Heading>
            <Text as="p" type="large" color="secondary" weight="normal">
              {t('Lectures, workshops and conversations across the university.')}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable={false} className="dotted-field">
          <VStack gap={8}>
            <Section variant="transparent" padding={compact ? 4 : 6}>
              <VStack className="dot-scrim">
                <DataBoundary
                  pending={dataState === 'loading'}
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
                      <PublicEventListItem
                        key={event.id}
                        event={event}
                        now={now}
                        compact={compact}
                      />
                    ))}
                  </List>
                </DataBoundary>
              </VStack>
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
  const { t } = useTranslation();
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
    <EventListItem
      event={event}
      compact={compact}
      className={ongoing ? 'live-row' : undefined}
      dateDetail={live}
      details={
        compact && (
          <HStack gap={3} wrap="wrap" vAlign="center" paddingBlockStart={1}>
            {live}
            {registration}
          </HStack>
        )
      }
      endContent={!compact && registration}
    />
  );
}

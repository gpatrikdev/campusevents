import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { EventRow } from '../components/EventRow';
import { DataBoundary } from '../components/Feedback';
import { instant } from '../domain/rules';
import { useEvents, useMock } from '../mocks/hooks';

export function EventsPage() {
  const { t } = useTranslation();
  const { now } = useMock();
  const query = useEvents();
  const mobile = useMediaQuery('(max-width: 48rem)');
  const events = (query.data ?? [])
    .filter((event) => event.status === 'published' && instant(event.end) > now)
    .sort((a, b) => instant(a.start) - instant(b.start));
  const guidance = (
    <Card variant="muted" padding={6}>
      <VStack gap={4}>
        <Heading level={2}>{t('Before you join')}</Heading>
        <Text as="p">{t('Everyone is welcome. A university email address is not required.')}</Text>
        <Text as="p">
          {t('Registration and cancellation close 24 hours before an event starts.')}
        </Text>
        <Text as="p" color="secondary">
          {t('Your QR ticket is available in Profile → Registrations.')}
        </Text>
      </VStack>
    </Card>
  );
  return (
    <VStack gap={8}>
      <VStack gap={3}>
        <Heading level={1}>{t('University events')}</Heading>
        <Text as="p" color="secondary">
          {t('Lectures, workshops and conversations across the university.')}
        </Text>
      </VStack>
      <Layout
        height="auto"
        padding={6}
        content={
          <LayoutContent padding={6}>
            <VStack gap={4}>
              <Heading level={2}>{t('Upcoming and ongoing')}</Heading>
              <Divider />
              <DataBoundary
                empty={!query.isPending && events.length === 0}
                title="No upcoming events"
                description="Published events will appear here."
              >
                <VStack gap={0}>
                  {events.map((event, index) => (
                    <VStack gap={0} key={event.id}>
                      <EventRow event={event} />
                      {index < events.length - 1 && <Divider />}
                    </VStack>
                  ))}
                </VStack>
              </DataBoundary>
            </VStack>
          </LayoutContent>
        }
        end={
          !mobile && (
            <LayoutPanel width={300} padding={6}>
              {guidance}
            </LayoutPanel>
          )
        }
      />
      {mobile && guidance}
    </VStack>
  );
}

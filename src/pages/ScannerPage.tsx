import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { formatDate } from '../domain/format';
import { HOUR, instant, isStaff } from '../domain/rules';
import type { Outcome } from '../domain/types';
import { useMock } from '../mocks/hooks';

export function ScannerPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user, run, setOutcome } = useMock();
  const [sample, setSample] = useState('valid');
  const [result, setResult] = useState<Outcome | null>(null);
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  const tickets = data.registrations.filter((item) => item.eventId === eventId);
  function scan() {
    const ticket =
      sample === 'valid'
        ? (tickets.find((item) => item.active && !item.checkedIn) ??
          tickets.find((item) => item.active))
        : sample === 'duplicate'
          ? tickets.find((item) => item.active && item.checkedIn)
          : sample === 'cancelled'
            ? tickets.find((item) => !item.active)
            : sample === 'wrong'
              ? data.registrations.find((item) => item.eventId !== eventId)
              : undefined;
    const outcome = run({ type: 'scan', eventId, ticket: ticket?.ticket ?? 'DEMO-unknown-ticket' });
    setOutcome(null);
    setResult(outcome);
  }
  return (
    <DataBoundary>
      <VStack gap={6} maxWidth={640} width="100%">
        <VStack gap={3}>
          <Heading level={1}>{t('QR scanner')}</Heading>
          <Text weight="semibold">{event.title}</Text>
          <Text color="secondary">
            {t(
              'Camera scanning is simulated in this phase. Use a sample scan to exercise ticket validation.',
            )}
          </Text>
        </VStack>
        <Text type="supporting">
          {t('Check-in window')}:{' '}
          {formatDate(instant(event.start) - HOUR, event.timezone, i18n.language)} –{' '}
          {formatDate(event.end, event.timezone, i18n.language)} · {event.timezone}
        </Text>
        <Card variant="muted" padding={10}>
          <VStack gap={4} hAlign="center">
            <Icon icon="stop" size="lg" />
            <Heading level={2}>{t('Scanner preview')}</Heading>
            <Text>{t('No camera is active')}</Text>
          </VStack>
        </Card>
        <Selector
          label={t('Sample QR scan')}
          value={sample}
          options={[
            { value: 'valid', label: t('Valid ticket') },
            { value: 'duplicate', label: t('Already checked in') },
            { value: 'cancelled', label: t('Cancelled ticket') },
            { value: 'wrong', label: t('Wrong event') },
            { value: 'unknown', label: t('Unknown ticket') },
          ]}
          onChange={(value) => {
            setSample(value);
            setResult(null);
          }}
        />
        <Button label={t('Simulate QR scan')} variant="primary" onClick={scan} />
        {result && (
          <VStack role="status">
            <Banner status={result.ok ? 'success' : 'warning'} title={t(result.message)} />
          </VStack>
        )}
      </VStack>
    </DataBoundary>
  );
}

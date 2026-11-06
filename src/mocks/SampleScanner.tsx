import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCodeIcon } from '../components/EventIcons';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { ScannerLayout } from '../components/ScannerLayout';
import { isStaff } from '../domain/rules';
import type { Outcome } from '../domain/types';
import { useMock } from './hooks';

export function SampleScanner({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 42rem)');
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
      <ScannerLayout
        event={event}
        description={t(
          'Camera scanning is simulated in this phase. Use a sample scan to exercise ticket validation.',
        )}
        viewport={
          <>
            <Icon icon={QrCodeIcon} size="lg" />
            <Heading level={3}>{t('Scanner preview')}</Heading>
            <Text>{t('No camera is active')}</Text>
          </>
        }
        controls={
          <HStack gap={3} wrap="wrap" vAlign="end">
            <Selector
              label={t('Sample QR scan')}
              width={compact ? '100%' : '20rem'}
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
            <Button
              label={t('Simulate QR scan')}
              variant="primary"
              width={compact ? '100%' : undefined}
              icon={<Icon icon={QrCodeIcon} />}
              onClick={scan}
            />
          </HStack>
        }
        feedback={
          result && (
            <VStack role="status">
              <Banner status={result.ok ? 'success' : 'warning'} title={t(result.message)} />
            </VStack>
          )
        }
      />
    </DataBoundary>
  );
}

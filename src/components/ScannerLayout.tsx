import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateRange } from '../domain/format';
import { HOUR, instant } from '../domain/rules';
import type { CampusEvent } from '../domain/types';

export function ScannerLayout({
  event,
  description,
  viewport,
  controls,
  feedback,
  availability,
}: {
  event: CampusEvent;
  description: string;
  viewport: ReactNode;
  controls: ReactNode;
  feedback?: ReactNode;
  availability?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const wide = useMediaQuery('(min-width: 64rem)');
  const compact = useMediaQuery('(max-width: 42rem)');
  const information = (
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={3}>{t('Check-in window')}</Heading>
        <Text>
          {formatDateRange(instant(event.start) - HOUR, event.end, event.timezone, i18n.language)}
        </Text>
        <Text color="secondary">{event.timezone}</Text>
        {availability}
      </VStack>
      <Divider />
      <VStack gap={3}>
        <Heading level={3}>{t('How to scan')}</Heading>
        <Text color="secondary">{description}</Text>
      </VStack>
    </VStack>
  );
  return (
    <VStack gap={6} width="100%">
      <Heading level={2} id="staff-task-heading">
        {t('QR scanner')}
      </Heading>
      <Layout
        height="auto"
        padding={compact ? 4 : 6}
        content={
          <LayoutContent isScrollable={false}>
            <VStack gap={6}>
              {controls}
              {feedback}
              <Card variant="muted" padding={0}>
                <VStack
                  minHeight={compact ? '16rem' : '24rem'}
                  vAlign="center"
                  hAlign="center"
                  gap={4}
                  className="scanner-viewport"
                >
                  {viewport}
                </VStack>
              </Card>
              {!wide && (
                <>
                  <Divider />
                  {information}
                </>
              )}
            </VStack>
          </LayoutContent>
        }
        end={
          wide && (
            <LayoutPanel width="20rem" padding={6} hasDivider isScrollable={false}>
              {information}
            </LayoutPanel>
          )
        }
      />
    </VStack>
  );
}

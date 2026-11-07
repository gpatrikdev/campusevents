import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import type { QuestionSummary } from '../domain/reviewForm';
import { isStaff } from '../domain/rules';

export function ReviewResultsPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const { data, user } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  const { count, questions } = data.results?.[eventId] ?? { count: 0, questions: [] };
  const padding = compact ? 4 : 6;
  return (
    <VStack gap={6} width="100%">
      <Banner
        status="info"
        title={t('Only staff can see these results.')}
        description={t('Names and email addresses are not shown.')}
        isDismissable
      />
      <VStack gap={3}>
        <Heading level={2} id="staff-task-heading">
          {t('Review results')}
        </Heading>
        <Text color="secondary">
          {t('A summary of each question from attendees who checked in.')}
        </Text>
      </VStack>
      <DataBoundary
        empty={count === 0}
        title={event.form ? 'No reviews yet' : 'This event has no review form.'}
        description={
          event.form
            ? 'Checked-in attendees can review after the event ends.'
            : 'Add questions to the draft before publishing to collect reviews.'
        }
      >
        <VStack gap={4} maxWidth="50rem" width="100%">
          <Card padding={padding} variant="muted">
            <MetadataList orientation="horizontal">
              <MetadataListItem label={t('Responses')}>
                <Text size="2xl" weight="semibold">
                  {count}
                </Text>
              </MetadataListItem>
              <MetadataListItem label={t('Questions')}>
                <Text size="2xl" weight="semibold">
                  {questions.length}
                </Text>
              </MetadataListItem>
            </MetadataList>
          </Card>
          {questions.map((summary) => (
            <Card key={summary.name} padding={padding}>
              <VStack gap={5}>
                <HStack gap={3} vAlign="start" hAlign="between">
                  <Heading level={3}>{summary.title}</Heading>
                  {/* A long question wraps; the answer count keeps its full width. */}
                  <StackItem>
                    <Badge label={t('Answers: {{count}}', { count: summary.count })} />
                  </StackItem>
                </HStack>
                <QuestionResult summary={summary} compact={compact} />
              </VStack>
            </Card>
          ))}
        </VStack>
      </DataBoundary>
    </VStack>
  );
}

function QuestionResult({ summary, compact }: { summary: QuestionSummary; compact: boolean }) {
  const { t, i18n } = useTranslation();
  const decimal = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent' });
  // Each bar is an option's share of the people who answered this question, so
  // multiple-choice shares can add up to more than 100%.
  const shares = (rows: { label: string; count: number }[]) => (
    <VStack gap={4}>
      {rows.map((row) => (
        <ProgressBar
          key={row.label}
          label={row.label}
          value={row.count}
          max={Math.max(summary.count, 1)}
          hasValueLabel
          formatValueLabel={(value, max) =>
            `${value} (${percent.format(summary.count ? value / max : 0)})`
          }
        />
      ))}
    </VStack>
  );
  if (summary.count === 0) return <Text color="secondary">{t('No answers')}</Text>;
  switch (summary.kind) {
    case 'rating':
      return (
        <Grid columns={compact ? 1 : 2} gap={6}>
          <VStack gap={1}>
            <Text color="secondary">{t('Average rating')}</Text>
            <HStack gap={2} vAlign="end">
              <Text size="2xl" weight="semibold">
                {decimal.format(summary.average)}
              </Text>
              <Text color="secondary">{t('out of 5')}</Text>
            </HStack>
          </VStack>
          {shares(
            summary.scores
              .map((value, index) => ({
                label: t('{{score}} out of 5', { score: index + 1 }),
                count: value,
              }))
              .reverse(),
          )}
        </Grid>
      );
    case 'number':
      return (
        <MetadataList orientation="horizontal">
          {[
            [t('Average'), summary.average],
            [t('Lowest'), summary.min],
            [t('Highest'), summary.max],
          ].map(([label, value]) => (
            <MetadataListItem key={label} label={String(label)}>
              <Text size="xl" weight="semibold">
                {number.format(Number(value))}
              </Text>
            </MetadataListItem>
          ))}
        </MetadataList>
      );
    case 'boolean':
      return shares([
        { label: t('Yes'), count: summary.yes },
        { label: t('No'), count: summary.no },
      ]);
    case 'choice':
      return shares(summary.options);
    case 'text':
      return (
        <List edge="flush" hasDividers density="spacious">
          {summary.answers.map((answer, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Anonymous answers can have identical text.
            <ListItem key={`${index}-${answer}`} label={<Text>{answer}</Text>} />
          ))}
        </List>
      );
  }
}

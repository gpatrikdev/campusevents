import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { isStaff } from '../domain/rules';

export function ReviewResultsPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user } = useApp();
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  const { count, average, comments } = data.results?.[eventId] ?? {
    count: 0,
    average: 0,
    comments: [],
  };
  return (
    <VStack gap={6} width="100%">
      <VStack gap={3}>
        <Heading level={2} id="staff-task-heading">
          {t('Review results')}
        </Heading>
        <Text color="secondary">
          {t('Only staff can see these results. Names and email addresses are not shown.')}
        </Text>
      </VStack>
      <DataBoundary
        empty={count === 0}
        title="No reviews yet"
        description="Checked-in attendees can review after the event ends."
      >
        <VStack gap={6} maxWidth="50rem" width="100%">
          <MetadataList orientation="horizontal">
            <MetadataListItem label={t('Average rating')}>
              <HStack gap={2} vAlign="center">
                <Text size="2xl" weight="semibold">
                  {new Intl.NumberFormat(i18n.language, {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  }).format(average)}
                </Text>
                <Text color="secondary">{t('out of 5')}</Text>
              </HStack>
            </MetadataListItem>
            <MetadataListItem label={t('Responses')}>
              <Text size="2xl" weight="semibold">
                {count}
              </Text>
            </MetadataListItem>
          </MetadataList>
          <Divider />
          <Heading level={3}>{t('Anonymous feedback')}</Heading>
          {comments.length ? (
            <List edge="flush" hasDividers density="spacious">
              {comments.map((comment, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Anonymous comments can have identical text.
                <ListItem key={`${index}-${comment}`} label={<Text>{comment}</Text>} />
              ))}
            </List>
          ) : (
            <Text>{t('No written comments')}</Text>
          )}
          <Text type="supporting">
            {t('Ratings are included in the average even without a comment.')}
          </Text>
        </VStack>
      </DataBoundary>
    </VStack>
  );
}

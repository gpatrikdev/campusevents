import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { isStaff } from '../domain/rules';
import { useMock } from '../mocks/hooks';

export function ReviewResultsPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user } = useMock();
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  const reviews = data.reviews.filter((item) => item.eventId === eventId);
  const comments = reviews.filter((item) => item.comment.trim());
  const average = reviews.length
    ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
    : 0;
  return (
    <VStack gap={6} maxWidth={800} width="100%">
      <Link href={`/staff/events/${eventId}`} isStandalone>
        {t('Back to dashboard')}
      </Link>
      <VStack gap={3}>
        <Heading level={1}>{t('Review results')}</Heading>
        <Text weight="semibold">{event.title}</Text>
        <Text color="secondary">
          {t('Only staff can see these results. Names and email addresses are not shown.')}
        </Text>
      </VStack>
      <DataBoundary
        empty={reviews.length === 0}
        title="No reviews yet"
        description="Checked-in attendees can review after the event ends."
      >
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
              {reviews.length}
            </Text>
          </MetadataListItem>
        </MetadataList>
        <Divider />
        <Heading level={2}>{t('Anonymous feedback')}</Heading>
        {comments.length ? (
          <List edge="flush" hasDividers density="spacious">
            {comments.map((review) => (
              <ListItem key={review.id} label={<Text>{review.comment}</Text>} />
            ))}
          </List>
        ) : (
          <Text>{t('No written comments')}</Text>
        )}
        <Text type="supporting">
          {t('Ratings are included in the average even without a comment.')}
        </Text>
      </DataBoundary>
    </VStack>
  );
}

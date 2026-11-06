import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { DataBoundary, EmptyNotice, UnavailableEvent } from '../components/Feedback';
import { reviewIssue } from '../domain/rules';
import { ReviewSurvey } from '../reviews/ReviewSurvey';

/** The signed-in attendee's own submitted review, shown in the review form read-only. */
export function ReviewDetailPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const { data, user, now } = useApp();
  const event = data.events.find((item) => item.id === eventId);
  const registration = data.registrations.find(
    (item) => item.eventId === eventId && item.userId === user?.id && item.active,
  );
  if (event?.status !== 'published') return <UnavailableEvent />;
  if (!user)
    return (
      <EmptyNotice
        title={t('Sign in to continue.')}
        actions={
          <Button
            label={t('Sign in')}
            href={`/sign-in?returnTo=${encodeURIComponent(`/reviews/${eventId}`)}`}
          />
        }
      />
    );
  const issue = reviewIssue(event, registration, now);
  return (
    <VStack gap={6} maxWidth={720} width="100%">
      <VStack gap={3}>
        <Heading level={1}>{t('Your review')}</Heading>
        <Link href={`/events/${event.id}`} color="primary" weight="semibold">
          {event.title}
        </Link>
        <Text color="secondary">{t('Your feedback is anonymous to organizers and admins.')}</Text>
      </VStack>
      <DataBoundary isPage>
        {registration?.review ? (
          <ReviewSurvey answers={registration.review} />
        ) : (
          <EmptyNotice
            headingLevel={2}
            title={t("You haven't reviewed this event.")}
            description={issue ? t(issue) : undefined}
            actions={!issue && <Button label={t('Write a review')} href={`/review/${event.id}`} />}
          />
        )}
      </DataBoundary>
    </VStack>
  );
}

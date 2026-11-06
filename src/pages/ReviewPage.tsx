import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { DataBoundary, EmptyNotice, UnavailableEvent } from '../components/Feedback';
import { formatDate } from '../domain/format';
import { reviewCutoff, reviewIssue } from '../domain/rules';
import { ReviewSurvey } from '../reviews/ReviewSurvey';

export function ReviewPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run } = useApp();
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
            href={`/sign-in?returnTo=${encodeURIComponent(`/review/${eventId}`)}`}
          />
        }
      />
    );
  // A submitted review, including one just sent from this form, opens read-only.
  if (registration?.review) return <Navigate to="/reviews/$eventId" params={{ eventId }} replace />;
  const issue = reviewIssue(event, registration, now);
  return (
    <VStack gap={6} maxWidth={720} width="100%">
      <VStack gap={3}>
        <Heading level={1}>{t('Review this event')}</Heading>
        <Text weight="semibold">{event.title}</Text>
        <Text color="secondary">{t('Your feedback is anonymous to organizers and admins.')}</Text>
      </VStack>
      <DataBoundary isPage>
        {issue ? (
          <EmptyNotice title={t(issue)} />
        ) : (
          <>
            <Text type="supporting">
              {t('Review deadline')}:{' '}
              {formatDate(reviewCutoff(event), event.timezone, i18n.language)} · {event.timezone}
            </Text>
            <ReviewSurvey
              onSubmit={async (answers) => (await run({ type: 'review', eventId, ...answers })).ok}
            />
          </>
        )}
      </DataBoundary>
    </VStack>
  );
}

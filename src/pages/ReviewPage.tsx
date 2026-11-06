import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Model } from 'survey-core';
import 'survey-core/i18n/hungarian';
import { Survey } from 'survey-react-ui';
import { useApp } from '../api/context';
import { DataBoundary, EmptyNotice, UnavailableEvent } from '../components/Feedback';
import { formatDate } from '../domain/format';
import { reviewCutoff, reviewIssue } from '../domain/rules';
import { reviewForm, reviewTheme } from '../reviews/form';

export function ReviewPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run } = useApp();
  const event = data.events.find((item) => item.id === eventId);
  const registration = data.registrations.find(
    (item) => item.eventId === eventId && item.userId === user?.id && item.active,
  );
  const model = useMemo(() => {
    const survey = new Model(reviewForm);
    survey.applyTheme(reviewTheme);
    return survey;
  }, []);
  useEffect(() => {
    model.locale = i18n.language;
    model.completeText = t('Submit review');
    // Astryx forms mark required fields "∙ Required" rather than with a red
    // asterisk. SurveyJS hides the mark from screen readers.
    model.requiredMark = `∙ ${t('Required')}`;
  }, [model, i18n.language, t]);
  useEffect(() => {
    const submit = async (sender: Model, options: { allow: boolean }) => {
      const result = await run({
        type: 'review',
        eventId,
        rating: Number(sender.data.rating),
        comment: String(sender.data.comment ?? ''),
      });
      options.allow = result.ok;
    };
    model.onCompleting.add(submit);
    return () => model.onCompleting.remove(submit);
  }, [model, run, eventId]);
  useEffect(() => () => model.dispose(), [model]);
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
            <Survey model={model} />
          </>
        )}
      </DataBoundary>
    </VStack>
  );
}

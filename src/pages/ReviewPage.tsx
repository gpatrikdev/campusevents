import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Model } from 'survey-core';
import 'survey-core/i18n/hungarian';
import { Survey } from 'survey-react-ui';
import { DataBoundary, UnavailableEvent } from '../components/Feedback';
import { formatDate } from '../domain/format';
import { reviewCutoff, reviewIssue } from '../domain/rules';
import { useMock } from '../mocks/hooks';
import { reviewForm, reviewTheme } from '../reviews/form';

export function ReviewPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run } = useMock();
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
    model.completeText = t('Save demo review');
  }, [model, i18n.language, t]);
  useEffect(() => {
    const submit = (sender: Model, options: { allow: boolean }) => {
      const result = run({
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
  const issue = reviewIssue(event, registration, now);
  return (
    <VStack gap={6} maxWidth={720} width="100%">
      <Link href="/profile" isStandalone>
        {t('Back to registrations')}
      </Link>
      <VStack gap={3}>
        <Heading level={1}>{t('Review this event')}</Heading>
        <Text weight="semibold">{event.title}</Text>
        <Text color="secondary">
          {t(
            'Your feedback is anonymous to organizers and admins. This preview stores it only in memory.',
          )}
        </Text>
      </VStack>
      <DataBoundary>
        {issue ? (
          <EmptyState
            title={t(issue)}
            actions={<Button label={t('Back to registrations')} href="/profile" />}
          />
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

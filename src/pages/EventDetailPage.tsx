import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { RichTextView } from '@astryxdesign/richtext';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { TicketDialog } from '../components/TicketDialog';
import { formatDate } from '../domain/format';
import { HOUR, hasEnded, instant, isStaff, joinIssue, registrationCutoff } from '../domain/rules';
import { useMock } from '../mocks/hooks';

export function EventDetailPage({
  eventId,
  preview = false,
}: {
  eventId: string;
  preview?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run } = useMock();
  const [confirm, setConfirm] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const mobile = useMediaQuery('(max-width: 48rem)');
  const event = data.events.find((item) => item.id === eventId);
  if (preview && !isStaff(user)) return <AccessNotice />;
  if (!event || (event.status === 'draft' && !preview)) return <UnavailableEvent />;
  const registration = data.registrations.find(
    (item) => item.eventId === event.id && item.userId === user?.id && item.active,
  );
  const issue = joinIssue(event, user, now);
  const ended = hasEnded(event, now);
  const returnTo = encodeURIComponent(`/events/${event.id}`);
  const takePart = (
    <VStack gap={5}>
      <Heading level={2}>{t('Take part')}</Heading>
      {preview ? (
        <Text color="secondary">
          {t('This is the same event page visitors will see after publication.')}
        </Text>
      ) : ended ? (
        <>
          <Text>{t('This event has ended.')}</Text>
          {registration && (
            <>
              <Text color="secondary">
                {t('Find your review and certificate actions in your profile.')}
              </Text>
              <Button href="/profile" label={t('Profile')} />
            </>
          )}
        </>
      ) : registration ? (
        <>
          <Text>{t('You are registered in this preview.')}</Text>
          <Button
            label={t('View ticket')}
            variant="primary"
            onClick={() => setTicketId(registration.id)}
          />
          <Text type="supporting">
            {t('Registration saved locally. No confirmation email was sent.')}
          </Text>
        </>
      ) : !user && now < registrationCutoff(event) ? (
        <Button href={`/sign-in?returnTo=${returnTo}`} label={t('Join event')} variant="primary" />
      ) : user && !user.profileComplete && now < registrationCutoff(event) ? (
        <Button
          href={`/complete-profile?returnTo=${returnTo}`}
          label={t('Complete your profile')}
          variant="primary"
        />
      ) : (
        <>
          <Button
            label={t('Join event')}
            variant="primary"
            isDisabled={!!issue}
            onClick={() => setConfirm(true)}
          />
          {issue && <Text color="secondary">{t(issue)}</Text>}
        </>
      )}
      <MetadataList label={{ position: 'top' }}>
        <MetadataListItem label={t('Registration deadline')}>
          {formatDate(registrationCutoff(event), event.timezone, i18n.language)}
        </MetadataListItem>
        <MetadataListItem label={t('Check-in window')}>
          {formatDate(instant(event.start) - HOUR, event.timezone, i18n.language)} –{' '}
          {formatDate(event.end, event.timezone, i18n.language)}
        </MetadataListItem>
      </MetadataList>
      <Text type="supporting">{event.timezone}</Text>
      <Text type="supporting">
        {t('Registration and cancellation close 24 hours before an event starts.')}
      </Text>
    </VStack>
  );

  return (
    <DataBoundary>
      <VStack gap={8}>
        <Link href={preview ? `/staff/events/${event.id}` : '/'} isStandalone>
          {t(preview ? 'Back to dashboard' : 'Back to events')}
        </Link>
        {preview && (
          <Banner
            status="info"
            title={t(event.status === 'draft' ? 'Draft preview' : 'Preview event')}
            collapsible={false}
          >
            <Text>{t('This is the same event page visitors will see after publication.')}</Text>
          </Banner>
        )}
        <VStack gap={4}>
          <HStack gap={3} wrap="wrap">
            <Badge
              label={t(
                event.status === 'draft'
                  ? 'Draft'
                  : ended
                    ? 'Past'
                    : now >= instant(event.start)
                      ? 'Ongoing'
                      : 'Upcoming',
              )}
            />
          </HStack>
          <Heading level={1}>{event.title}</Heading>
          <MetadataList orientation="horizontal">
            <MetadataListItem label={t('Date and time')}>
              {formatDate(event.start, event.timezone, i18n.language)} –{' '}
              {formatDate(event.end, event.timezone, i18n.language)}
            </MetadataListItem>
            <MetadataListItem label={t('Location')}>{event.location}</MetadataListItem>
            <MetadataListItem label={t('Timezone')}>{event.timezone}</MetadataListItem>
          </MetadataList>
        </VStack>
        <Layout
          height="auto"
          padding={6}
          content={
            <LayoutContent padding={6}>
              <VStack gap={6}>
                <Heading level={2}>{t('About this event')}</Heading>
                <RichTextView value={event.content} />
              </VStack>
            </LayoutContent>
          }
          end={
            !mobile && (
              <LayoutPanel width={320} padding={6} hasDivider>
                {takePart}
              </LayoutPanel>
            )
          }
        />
        {mobile && takePart}
        <ConfirmDialog
          isOpen={confirm}
          onOpenChange={setConfirm}
          title="Confirm registration"
          description="Confirm your registration for this event."
          label="Confirm registration"
          onConfirm={() => run({ type: 'join', eventId: event.id })}
        />
        <TicketDialog registrationId={ticketId} onClose={() => setTicketId(null)} />
      </VStack>
    </DataBoundary>
  );
}

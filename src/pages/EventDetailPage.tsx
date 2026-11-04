import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { RichTextView } from '@astryxdesign/richtext';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { TicketDialog } from '../components/TicketDialog';
import { formatDate, formatDateRange } from '../domain/format';
import { HOUR, hasEnded, instant, isStaff, joinIssue, registrationCutoff } from '../domain/rules';

export function EventDetailPage({
  eventId,
  preview = false,
}: {
  eventId: string;
  preview?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run, setOutcome } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const ticketButton = useRef<HTMLButtonElement>(null);
  const focusTicketAfterJoin = useRef(false);
  useEffect(() => {
    if (confirm || !focusTicketAfterJoin.current) return;
    const frame = requestAnimationFrame(() => {
      ticketButton.current?.focus();
      focusTicketAfterJoin.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [confirm]);
  const narrow = useMediaQuery('(max-width: 56rem)');
  const compact = useMediaQuery('(max-width: 42rem)');
  const event = data.events.find((item) => item.id === eventId);
  if (preview && !isStaff(user)) return <AccessNotice />;
  if (!event || (event.status === 'draft' && !preview)) return <UnavailableEvent />;

  const registration = data.registrations.find(
    (item) => item.eventId === event.id && item.userId === user?.id && item.active,
  );
  const issue = joinIssue(event, user, now);
  const ended = hasEnded(event, now);
  const cutoff = registrationCutoff(event);
  const returnTo = encodeURIComponent(`/events/${event.id}`);
  const takePart = (
    <Section variant="muted" padding={6}>
      <VStack gap={4}>
        <Heading level={2}>{t('Take part')}</Heading>
        {preview ? (
          <Text color="secondary">
            {t('Registration actions are unavailable in staff preview.')}
          </Text>
        ) : ended ? (
          <>
            <Text>{t('This event has ended.')}</Text>
            {registration && (
              <>
                <Text color="secondary">
                  {t(
                    registration.checkedIn
                      ? 'Find your review and certificate actions under Registrations.'
                      : 'Only checked-in attendees are eligible.',
                  )}
                </Text>
                <Button href="/registrations" label={t('Registrations')} size="lg" />
              </>
            )}
          </>
        ) : registration ? (
          <>
            <HStack gap={2} vAlign="center">
              <Icon icon="check" color="success" />
              <Text weight="semibold">{t('You are registered.')}</Text>
            </HStack>
            <Button
              ref={ticketButton}
              label={t('View ticket')}
              variant="primary"
              size="lg"
              width="100%"
              onClick={() => setTicketId(registration.id)}
            />
          </>
        ) : now >= cutoff ? (
          <Text weight="semibold">{t('Registration closed')}</Text>
        ) : !user ? (
          <>
            <Text color="secondary">{t('Sign in to continue.')}</Text>
            <Button
              href={`/sign-in?returnTo=${returnTo}`}
              label={t('Join event')}
              variant="primary"
              size="lg"
              width="100%"
            />
          </>
        ) : !user.profileComplete ? (
          <Button
            href={`/complete-profile?returnTo=${returnTo}`}
            label={t('Complete your profile')}
            variant="primary"
            size="lg"
            width="100%"
          />
        ) : issue ? (
          <Text color="secondary">{t(issue)}</Text>
        ) : (
          <Button
            label={t('Join event')}
            variant="primary"
            size="lg"
            width="100%"
            onClick={() => setConfirm(true)}
          />
        )}
        {!ended && (
          <>
            <Divider />
            <MetadataList label={{ position: 'top' }}>
              <MetadataListItem label={t('Registration deadline')}>
                {formatDate(cutoff, event.timezone, i18n.language)}
              </MetadataListItem>
              <MetadataListItem label={t('Check-in window')}>
                {formatDateRange(
                  instant(event.start) - HOUR,
                  event.end,
                  event.timezone,
                  i18n.language,
                )}
              </MetadataListItem>
            </MetadataList>
            <Text type="supporting">
              {t('Registration and cancellation close 24 hours before an event starts.')}
            </Text>
          </>
        )}
      </VStack>
    </Section>
  );

  return (
    <DataBoundary emptyContent={<UnavailableEvent />}>
      <Layout
        height="auto"
        padding={compact ? 4 : 6}
        header={
          <LayoutHeader hasDivider>
            <VStack gap={5} paddingBlockStart={compact ? 4 : 0} paddingBlockEnd={4}>
              {preview && (
                <Banner
                  status="info"
                  title={t(event.status === 'draft' ? 'Draft preview' : 'Preview event')}
                  description={t(
                    'This is the same event page visitors will see after publication.',
                  )}
                />
              )}
              <VStack gap={3}>
                <Heading level={1} type={compact ? 'display-3' : 'display-2'} textWrap="balance">
                  {event.title}
                </Heading>
                {!ended && now >= instant(event.start) && event.status === 'published' && (
                  <Text type="label">{t('Ongoing')}</Text>
                )}
              </VStack>
              <MetadataList orientation="horizontal">
                <MetadataListItem label={t('Date and time')}>
                  <VStack gap={1}>
                    <Text>
                      {formatDateRange(event.start, event.end, event.timezone, i18n.language)}
                    </Text>
                    <Text type="supporting">{event.timezone}</Text>
                  </VStack>
                </MetadataListItem>
                <MetadataListItem label={t('Location')}>{event.location}</MetadataListItem>
              </MetadataList>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent isScrollable={false}>
            <VStack gap={8}>
              {narrow && takePart}
              <VStack gap={4} className="event-description">
                <Heading level={2}>{t('About this event')}</Heading>
                <RichTextView value={event.content} />
              </VStack>
            </VStack>
          </LayoutContent>
        }
        end={
          !narrow && (
            <LayoutPanel width="21rem" padding={6} hasDivider isScrollable={false}>
              {takePart}
            </LayoutPanel>
          )
        }
      />
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={(open) => {
          setConfirm(open);
          if (!open) setJoinError(null);
        }}
        title="Confirm registration"
        description="{{event}} starts on {{start}} ({{timezone}}). Your QR ticket will be available after you register."
        descriptionValues={{
          event: event.title,
          start: formatDate(event.start, event.timezone, i18n.language),
          timezone: event.timezone,
        }}
        label="Confirm registration"
        errorMessage={joinError}
        onConfirm={async () => {
          const outcome = await run({ type: 'join', eventId: event.id });
          if (!outcome.ok) {
            setOutcome(null);
            setJoinError(outcome.message);
            return false;
          }
          focusTicketAfterJoin.current = true;
          return true;
        }}
      />
      <TicketDialog registrationId={ticketId} onClose={() => setTicketId(null)} />
    </DataBoundary>
  );
}

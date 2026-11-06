import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { RichTextView } from '@astryxdesign/richtext';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { TicketDialog } from '../components/TicketDialog';
import { formatDate, formatDateRange } from '../domain/format';
import {
  certificateIssue,
  HOUR,
  hasEnded,
  instant,
  isStaff,
  joinIssue,
  registrationCutoff,
  reviewIssue,
} from '../domain/rules';

export function EventDetailPage({
  eventId,
  preview = false,
}: {
  eventId: string;
  preview?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run, preview: demo } = useApp();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [certificateEventId, setCertificateEventId] = useState<string | null>(null);
  const registrationHeading = useRef<HTMLHeadingElement>(null);
  const narrow = useMediaQuery('(max-width: 56rem)');
  const compact = useMediaQuery('(max-width: 42rem)');
  const event = data.events.find((item) => item.id === eventId);
  if (preview && !isStaff(user)) return <AccessNotice />;
  if (!event || (event.status === 'draft' && !preview)) return <UnavailableEvent />;

  const eventRegistrations = data.registrations.filter(
    (item) => !preview && item.eventId === event.id && item.userId === user?.id,
  );
  const registration = eventRegistrations.find((item) => item.active);
  const checkedIn = registration?.checkedIn;
  const ended = hasEnded(event, now);
  const registrationTitle = checkedIn
    ? "You're checked in"
    : registration
      ? "You're registered"
      : eventRegistrations.length > 0
        ? 'Registration cancelled'
        : 'Take part';
  const issue = joinIssue(event, user, now);
  const cutoff = registrationCutoff(event);
  const review = reviewIssue(event, registration, now);
  const certificate =
    import.meta.env.DEV && demo && registration?.certificate === 'sent'
      ? 'Certificate request simulated. No PDF was issued or emailed.'
      : certificateIssue(event, registration, now);
  const returnTo = encodeURIComponent(`/events/${event.id}`);
  const takePart = (
    <Section variant="muted" padding={6}>
      <VStack gap={4}>
        <Heading
          ref={registrationHeading}
          level={2}
          style={!ended && checkedIn ? { color: 'var(--color-text-success)' } : undefined}
        >
          {t(ended ? 'This event has ended.' : registrationTitle)}
        </Heading>
        {preview ? (
          <Text color="secondary">
            {t('Registration actions are unavailable in staff preview.')}
          </Text>
        ) : ended ? (
          checkedIn ? (
            <>
              {review ? (
                <Text color="secondary">{t(review)}</Text>
              ) : (
                <Button
                  href={`/review/${event.id}`}
                  label={t('Write a review')}
                  variant="primary"
                  size="lg"
                  width="100%"
                />
              )}
              {certificate ? (
                <Text color="secondary">{t(certificate)}</Text>
              ) : (
                <Button
                  label={t('Request certificate')}
                  variant={review ? 'primary' : 'secondary'}
                  size="lg"
                  width="100%"
                  onClick={() => setCertificateEventId(event.id)}
                />
              )}
            </>
          ) : registration ? (
            <Text color="secondary">
              {t(
                "You weren't checked in, so you can't review this event or request a certificate.",
              )}
            </Text>
          ) : null
        ) : checkedIn ? null : registration ? (
          now < cutoff ? (
            <>
              <Button
                label={t('Cancel registration')}
                variant="destructive"
                size="lg"
                width="100%"
                onClick={() => setCancelId(registration.id)}
              />
              <Text type="supporting">
                {t('Your QR ticket will appear here when cancellation closes.')}
              </Text>
            </>
          ) : (
            <Button
              label={t('Show QR ticket')}
              variant="primary"
              size="lg"
              width="100%"
              onClick={() => setTicketId(registration.id)}
            />
          )
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
            clickAction={async () => {
              const heading = registrationHeading.current;
              // A failed join shows in the banner at the top of the page, like
              // every other action's result.
              const outcome = await run({ type: 'join', eventId: event.id });
              if (!outcome.ok) return;
              requestAnimationFrame(() => {
                if (!heading?.isConnected) return;
                heading.tabIndex = -1;
                heading.focus();
              });
            }}
          />
        )}
        {!ended && !checkedIn && (
          <>
            <Divider />
            <MetadataList label={{ position: 'top' }}>
              {!registration && (
                <MetadataListItem label={t('Registration deadline')}>
                  {formatDate(cutoff, event.timezone, i18n.language)}
                </MetadataListItem>
              )}
              <MetadataListItem label={t('Check-in window')}>
                {formatDateRange(
                  instant(event.start) - HOUR,
                  event.end,
                  event.timezone,
                  i18n.language,
                )}
              </MetadataListItem>
            </MetadataList>
            {!registration && (
              <Text type="supporting">
                {t('Registration and cancellation close 24 hours before an event starts.')}
              </Text>
            )}
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
        isOpen={!checkedIn && now < cutoff && cancelId !== null && cancelId === registration?.id}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
        title="Cancel this registration?"
        description="Your QR ticket will become invalid. You can register again before the deadline."
        label="Cancel registration"
        destructive
        onConfirm={async () => {
          if (cancelId) await run({ type: 'cancel', registrationId: cancelId });
        }}
      />
      <ConfirmDialog
        isOpen={certificateEventId === event.id}
        onOpenChange={(open) => {
          if (!open) setCertificateEventId(null);
        }}
        title="Request a certificate?"
        description="We will email the PDF using your confirmed name and selected language. You can request it once."
        label="Request certificate"
        onConfirm={async () => {
          if (certificateEventId) await run({ type: 'certificate', eventId: certificateEventId });
        }}
      />
      <TicketDialog
        registrationId={
          !checkedIn && !ended && now >= cutoff && ticketId === registration?.id ? ticketId : null
        }
        onClose={() => setTicketId(null)}
      />
    </DataBoundary>
  );
}

import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { belowNavHeight, DataBoundary, EmptyNotice } from '../components/Feedback';
import { TicketDialog } from '../components/TicketDialog';
import { formatDate, formatDateRange } from '../domain/format';
import {
  certificateIssue,
  hasEnded,
  instant,
  registrationCutoff,
  reviewIssue,
} from '../domain/rules';
import type { CampusEvent, Registration } from '../domain/types';

function RegistrationRow({
  registration,
  event,
  compact,
  onTicket,
  onCancel,
  onCertificate,
}: {
  registration: Registration;
  event: CampusEvent;
  compact: boolean;
  onTicket: (id: string) => void;
  onCancel: (id: string) => void;
  onCertificate: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const { now, preview } = useApp();
  const ended = hasEnded(event, now);
  const review = reviewIssue(event, registration, now);
  const certificate =
    import.meta.env.DEV && preview && registration.certificate === 'sent'
      ? 'Certificate request simulated. No PDF was issued or emailed.'
      : certificateIssue(event, registration, now);
  const actions = !registration.active ? null : !ended ? (
    <HStack gap={3} hAlign="end" wrap="wrap">
      <Button
        label={t('Show QR ticket')}
        variant="primary"
        onClick={() => onTicket(registration.id)}
      />
      {now < registrationCutoff(event) && (
        <Button
          label={t('Cancel registration')}
          variant="destructive"
          onClick={() => onCancel(registration.id)}
        />
      )}
    </HStack>
  ) : registration.checkedIn && (!review || !certificate) ? (
    <HStack gap={3} hAlign="end" wrap="wrap">
      {!review && <Button label={t('Write a review')} href={`/review/${event.id}`} />}
      {!certificate && (
        <Button label={t('Request certificate')} onClick={() => onCertificate(event.id)} />
      )}
    </HStack>
  ) : null;
  return (
    <ListItem
      align="start"
      startContent={
        !compact && (
          <VStack width="7.5rem">
            <Text weight="semibold">
              {formatDate(event.start, event.timezone, i18n.language, false)}
            </Text>
          </VStack>
        )
      }
      label={
        <Link href={`/events/${event.id}`} weight="semibold" size="lg" color="primary">
          {event.title}
        </Link>
      }
      endContent={compact ? undefined : actions}
      description={
        <VStack gap={3} paddingBlockStart={1}>
          <VStack gap={1}>
            <Text color="secondary">
              {formatDateRange(event.start, event.end, event.timezone, i18n.language, compact)}
            </Text>
            <Text color="secondary">{event.location}</Text>
            <Text type="supporting">{event.timezone}</Text>
          </VStack>
          {!registration.active ? (
            <VStack gap={1}>
              <Text type="label">{t('Cancelled')}</Text>
              <Text type="supporting">
                {t('Registration cancelled. Your QR ticket is now invalid.')}
              </Text>
            </VStack>
          ) : ended ? (
            <VStack gap={3}>
              <Text type="supporting">
                {t(registration.checkedIn ? 'Checked in' : 'Not checked in')}
              </Text>
              {registration.checkedIn ? (
                <>
                  {review && <Text type="supporting">{t(review)}</Text>}
                  {certificate && <Text type="supporting">{t(certificate)}</Text>}
                </>
              ) : (
                <Text type="supporting">{t('Only checked-in attendees are eligible.')}</Text>
              )}
            </VStack>
          ) : null}
          {compact && actions}
        </VStack>
      }
    />
  );
}

export function RegistrationsPage() {
  const { t } = useTranslation();
  const { data, user, now, run } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  const [ticket, setTicket] = useState<string | null>(null);
  const [cancel, setCancel] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<string | null>(null);
  if (!user)
    return (
      <EmptyNotice
        minHeight={belowNavHeight}
        headingLevel={1}
        title={t('Sign in to continue.')}
        description={t('Tickets, attendance and follow-up actions in one place.')}
        actions={<Button label={t('Sign in')} href="/sign-in?returnTo=%2Fregistrations" />}
      />
    );
  if (!user.profileComplete)
    return (
      <EmptyNotice
        minHeight={belowNavHeight}
        headingLevel={1}
        title={t('Complete your profile')}
        description={t('Confirm your profile name first.')}
        actions={
          <Button
            label={t('Complete your profile')}
            href="/complete-profile?returnTo=%2Fregistrations"
          />
        }
      />
    );
  const registrations = data.registrations
    .filter((item) => item.userId === user.id)
    .flatMap((registration) => {
      const event = data.events.find(
        (item) => item.id === registration.eventId && item.status === 'published',
      );
      return event ? [{ registration, event }] : [];
    });
  const groups = [
    {
      title: 'Upcoming registrations',
      items: registrations
        .filter(({ registration, event }) => registration.active && !hasEnded(event, now))
        .sort((a, b) => instant(a.event.start) - instant(b.event.start)),
    },
    {
      title: 'Past registrations',
      items: registrations
        .filter(({ registration, event }) => registration.active && hasEnded(event, now))
        .sort((a, b) => instant(b.event.start) - instant(a.event.start)),
    },
    {
      title: 'Cancelled registrations',
      items: registrations.filter(({ registration }) => !registration.active),
    },
  ];
  return (
    <>
      <Layout
        height="auto"
        padding={compact ? 4 : 6}
        header={
          <LayoutHeader hasDivider>
            <VStack gap={3} paddingBlockStart={compact ? 4 : 0} paddingBlockEnd={4}>
              <Heading level={1} type={compact ? 'display-3' : 'display-2'}>
                {t('Registrations')}
              </Heading>
              <Text as="p" type="large" color="secondary" weight="normal">
                {t('Tickets, attendance and follow-up actions in one place.')}
              </Text>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent isScrollable={false}>
            <VStack gap={8}>
              <DataBoundary
                empty={registrations.length === 0}
                emptyContent={
                  <EmptyNotice
                    headingLevel={2}
                    title={t('No registrations yet')}
                    description={t(
                      'Find an event and confirm your registration to get a QR ticket.',
                    )}
                    actions={<Button href="/" label={t('Browse events')} />}
                  />
                }
              >
                {groups
                  .filter((group) => group.items.length > 0)
                  .map((group) => (
                    <List
                      key={group.title}
                      density="spacious"
                      edge="outset"
                      hasDividers
                      header={<Heading level={2}>{t(group.title)}</Heading>}
                    >
                      {group.items.map(({ registration, event }) => (
                        <RegistrationRow
                          key={registration.id}
                          registration={registration}
                          event={event}
                          compact={compact}
                          onTicket={setTicket}
                          onCancel={setCancel}
                          onCertificate={setCertificate}
                        />
                      ))}
                    </List>
                  ))}
              </DataBoundary>
            </VStack>
          </LayoutContent>
        }
      />
      <TicketDialog registrationId={ticket} onClose={() => setTicket(null)} />
      <ConfirmDialog
        isOpen={!!cancel}
        onOpenChange={(open) => {
          if (!open) setCancel(null);
        }}
        title="Cancel this registration?"
        description="Your QR ticket will become invalid. You can register again before the deadline."
        label="Cancel registration"
        destructive
        onConfirm={async () => {
          if (cancel) await run({ type: 'cancel', registrationId: cancel });
        }}
      />
      <ConfirmDialog
        isOpen={!!certificate}
        onOpenChange={(open) => {
          if (!open) setCertificate(null);
        }}
        title="Request a certificate?"
        description="We will email the PDF using your confirmed name and selected language. You can request it once."
        label="Request certificate"
        onConfirm={async () => {
          if (certificate) await run({ type: 'certificate', eventId: certificate });
        }}
      />
    </>
  );
}

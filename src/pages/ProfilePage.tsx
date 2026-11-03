import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Selector } from '@astryxdesign/core/Selector';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataBoundary } from '../components/Feedback';
import { TicketDialog } from '../components/TicketDialog';
import { formatDate } from '../domain/format';
import {
  certificateIssue,
  hasEnded,
  instant,
  registrationCutoff,
  reviewIssue,
} from '../domain/rules';
import type { CampusEvent, Registration } from '../domain/types';
import { useMock } from '../mocks/hooks';

function RegistrationRow({
  registration,
  event,
  onTicket,
  onCancel,
  onCertificate,
}: {
  registration: Registration;
  event: CampusEvent;
  onTicket: (id: string) => void;
  onCancel: (id: string) => void;
  onCertificate: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const { now } = useMock();
  const ended = hasEnded(event, now);
  const review = reviewIssue(event, registration, now);
  const certificate = certificateIssue(event, registration, now);
  return (
    <VStack gap={4} paddingBlock={5} as="article">
      <VStack gap={2}>
        <HStack wrap="wrap" gap={3} vAlign="center">
          <Link href={`/events/${event.id}`} weight="semibold" size="lg" color="primary">
            {event.title}
          </Link>
          {!registration.active && <Badge label={t('Cancelled')} />}
        </HStack>
        <Text>
          {formatDate(event.start, event.timezone, i18n.language)} · {event.timezone}
        </Text>
        <Text color="secondary">{event.location}</Text>
      </VStack>
      {!registration.active ? (
        <Text type="supporting">
          {t('Registration cancelled locally. This demo ticket is now invalid.')}
        </Text>
      ) : !ended ? (
        <HStack gap={3} wrap="wrap">
          <Button
            label={t('Show QR ticket')}
            variant="primary"
            onClick={() => onTicket(registration.id)}
          />
          {now < registrationCutoff(event) && (
            <Button
              label={t('Cancel registration')}
              variant="ghost"
              onClick={() => onCancel(registration.id)}
            />
          )}
        </HStack>
      ) : (
        <VStack gap={3}>
          <Text type="supporting">
            {t(registration.checkedIn ? 'Checked in' : 'Not checked in')}
          </Text>
          {registration.checkedIn ? (
            <>
              <HStack gap={3} wrap="wrap">
                {!review && <Button label={t('Write a review')} href={`/review/${event.id}`} />}
                {!certificate && (
                  <Button
                    label={t('Request certificate')}
                    onClick={() => onCertificate(event.id)}
                  />
                )}
              </HStack>
              {review && <Text type="supporting">{t(review)}</Text>}
              {certificate && <Text type="supporting">{t(certificate)}</Text>}
            </>
          ) : (
            <Text type="supporting">{t('Only checked-in attendees are eligible.')}</Text>
          )}
        </VStack>
      )}
    </VStack>
  );
}

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { data, user, now, run, setIdentity, setOutcome } = useMock();
  const [tab, setTab] = useState('registrations');
  const [ticket, setTicket] = useState<string | null>(null);
  const [cancel, setCancel] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<string | null>(null);
  if (!user)
    return (
      <EmptyState
        headingLevel={1}
        title={t('Sign in to continue.')}
        description={t('Tickets, attendance and follow-up actions in one place.')}
        actions={<Button label={t('Sign in')} href="/sign-in" />}
      />
    );
  if (!user.profileComplete)
    return (
      <EmptyState
        headingLevel={1}
        title={t('Complete your profile')}
        description={t('Confirm your profile name first.')}
        actions={<Button label={t('Complete your profile')} href="/complete-profile" />}
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
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={1}>{t('Profile')}</Heading>
        <Text color="secondary">
          {user.name} · {t('Tickets, attendance and follow-up actions in one place.')}
        </Text>
      </VStack>
      <TabList role="tablist" value={tab} onChange={setTab} hasDivider aria-label={t('Profile')}>
        <Tab value="registrations" label={t('Registrations')} panelId="registrations-panel" />
        <Tab value="account" label={t('Account')} panelId="account-panel" />
      </TabList>
      {tab === 'registrations' ? (
        <VStack
          as="section"
          id="registrations-panel"
          role="tabpanel"
          aria-label={t('Registrations')}
          gap={8}
        >
          <DataBoundary
            empty={registrations.length === 0}
            title="No registrations yet"
            description="Find an event and confirm your registration to get a QR ticket."
          >
            {groups.map(
              (group) =>
                group.items.length > 0 && (
                  <VStack key={group.title} gap={3}>
                    <Heading level={2}>{t(group.title)}</Heading>
                    <Divider />
                    {group.items.map(({ registration, event }) => (
                      <VStack gap={0} key={registration.id}>
                        <RegistrationRow
                          registration={registration}
                          event={event}
                          onTicket={setTicket}
                          onCancel={setCancel}
                          onCertificate={setCertificate}
                        />
                        <Divider />
                      </VStack>
                    ))}
                  </VStack>
                ),
            )}
          </DataBoundary>
          <Link href="/" isStandalone>
            {t('Browse events')}
          </Link>
        </VStack>
      ) : (
        <VStack
          as="section"
          id="account-panel"
          role="tabpanel"
          aria-label={t('Account')}
          gap={6}
          maxWidth={640}
        >
          <Heading level={2}>{t('Account information')}</Heading>
          <MetadataList>
            <MetadataListItem label={t('Name')}>{user.name}</MetadataListItem>
            <MetadataListItem label={t('Email address')}>{user.email}</MetadataListItem>
            <MetadataListItem label={t('Permission')}>
              {t(
                user.role === 'admin'
                  ? 'Admin'
                  : user.role === 'organizer'
                    ? 'Organizer'
                    : 'Regular attendee',
              )}
            </MetadataListItem>
          </MetadataList>
          <Text type="supporting">{t('Your name is permanent.')}</Text>
          <Selector
            label={t('Interface language')}
            value={i18n.language}
            options={[
              { value: 'en', label: 'English' },
              { value: 'hu', label: 'Magyar' },
            ]}
            onChange={(value) => {
              void i18n.changeLanguage(value);
            }}
            description={t(
              'This preference will also apply to emails and certificates once delivery is implemented.',
            )}
          />
          {user.role && (
            <Text color="secondary">
              {t('Existing registrations remain available after an organizer promotion.')}
            </Text>
          )}
          <Button
            label={t('Sign out of preview')}
            variant="ghost"
            onClick={() => {
              setIdentity('visitor');
              setOutcome(null);
            }}
          />
        </VStack>
      )}
      <TicketDialog registrationId={ticket} onClose={() => setTicket(null)} />
      <ConfirmDialog
        isOpen={!!cancel}
        onOpenChange={(open) => {
          if (!open) setCancel(null);
        }}
        title="Cancel this registration?"
        description="Your demo QR ticket will become invalid. You can register again before the deadline."
        label="Cancel registration"
        destructive
        onConfirm={() => {
          if (cancel) run({ type: 'cancel', registrationId: cancel });
        }}
      />
      <ConfirmDialog
        isOpen={!!certificate}
        onOpenChange={(open) => {
          if (!open) setCertificate(null);
        }}
        title="Request a certificate?"
        description="A real certificate would use your confirmed name, event details, and selected language. This preview creates no PDF and sends no email."
        label="Simulate certificate request"
        onConfirm={() => {
          if (certificate) run({ type: 'certificate', eventId: certificate });
        }}
      />
    </VStack>
  );
}

import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { isStaff } from '../domain/rules';

export function AttendeesPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user } = useApp();
  const [search, setSearch] = useState('');
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  const attendees = (data.attendees?.[eventId] ?? []).filter((attendee) =>
    `${attendee.name} ${attendee.email}`
      .toLocaleLowerCase(i18n.language)
      .includes(search.toLocaleLowerCase(i18n.language).trim()),
  );
  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={1}>{t('Attendee list')}</Heading>
        <Text weight="semibold">{event.title}</Text>
        <Text color="secondary">
          {t('View only. Check-in is available through QR scanning only.')}
        </Text>
      </VStack>
      <TextInput
        label={t('Search attendees')}
        type="search"
        placeholder={t('Search by name or email')}
        value={search}
        onChange={setSearch}
        hasClear
        width="28rem"
      />
      <DataBoundary
        empty={attendees.length === 0}
        title="No attendees found"
        description="Try another name or email, or check back after registrations."
      >
        <List edge="flush" hasDividers density="spacious">
          {attendees.map((attendee) => (
            <ListItem
              key={attendee.id}
              label={
                <VStack gap={2}>
                  <Text weight="semibold">{attendee.name}</Text>
                  <Text color="secondary">{attendee.email}</Text>
                  <Text type="supporting">
                    {t(attendee.checkedIn ? 'Checked in' : 'Not checked in')}
                  </Text>
                </VStack>
              }
            />
          ))}
        </List>
      </DataBoundary>
    </VStack>
  );
}

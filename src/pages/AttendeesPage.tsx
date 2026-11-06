import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { proportional, Table } from '@astryxdesign/core/Table';
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
  // Table rows must be plain objects, so copy the fields the table shows.
  const rows = attendees.map(({ id, name, email, checkedIn }) => ({ id, name, email, checkedIn }));
  return (
    <VStack gap={6}>
      <Banner
        status="info"
        title={t('View only.')}
        description={t('Check-in is available through QR scanning only.')}
        isDismissable
      />
      <VStack gap={3}>
        <Heading level={2} id="staff-task-heading">
          {t('Attendee list')}
        </Heading>
        <Text color="secondary">
          {t('Everyone currently registered for this event, and whether they have checked in.')}
        </Text>
      </VStack>
      <TextInput
        label={t('Search attendees')}
        type="search"
        startIcon="search"
        placeholder={t('Search by name or email')}
        value={search}
        onChange={setSearch}
        hasClear
        width="100%"
      />
      <DataBoundary
        empty={attendees.length === 0}
        title="No attendees found"
        description="Try another name or email, or check back after registrations."
      >
        <Card>
          <Table
            data={rows}
            idKey="id"
            hasHover
            textOverflow="truncate"
            aria-labelledby="staff-task-heading"
            columns={[
              {
                key: 'name',
                header: t('Name'),
                width: proportional(1, { minWidth: 160 }),
                renderCell: (attendee) => (
                  <Text type="inherit" weight="semibold" maxLines={1}>
                    {attendee.name}
                  </Text>
                ),
              },
              {
                key: 'email',
                header: t('Email'),
                width: proportional(1, { minWidth: 200 }),
                renderCell: (attendee) => (
                  <Text type="inherit" color="secondary" maxLines={1}>
                    {attendee.email}
                  </Text>
                ),
              },
              {
                key: 'checkedIn',
                header: t('Attendance status'),
                width: proportional(1, { minWidth: 140 }),
                renderCell: (attendee) => (
                  <Badge
                    label={t(attendee.checkedIn ? 'Checked in' : 'Not checked in')}
                    variant={attendee.checkedIn ? 'green' : 'neutral'}
                  />
                ),
              },
            ]}
          />
        </Card>
      </DataBoundary>
    </VStack>
  );
}

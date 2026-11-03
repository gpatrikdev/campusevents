import { Heading } from '@astryxdesign/core/Heading';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { proportional, Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AccessNotice, DataBoundary } from '../components/Feedback';
import { useMock } from '../mocks/hooks';

export function OrganizersPage() {
  const { t, i18n } = useTranslation();
  const { user, data, run } = useMock();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  if (user?.role !== 'admin') return <AccessNotice admin />;
  const accounts = data.users.filter((item) =>
    `${item.name} ${item.email}`
      .toLocaleLowerCase(i18n.language)
      .includes(search.trim().toLocaleLowerCase(i18n.language)),
  );
  // Table rows must be plain objects; User is an interface, so copy the fields.
  const rows = accounts.map(({ id, name, email, role }) => ({ id, name, email, role }));
  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={1}>{t('Organizer permissions')}</Heading>
        <Text color="secondary">
          {t('Organizers manage all events. Existing attendee registrations are kept.')}
        </Text>
      </VStack>
      <TextInput
        label={t('Search accounts')}
        placeholder={t('Search by name or email')}
        value={search}
        onChange={setSearch}
        type="search"
        hasClear
        width="100%"
      />
      <DataBoundary
        empty={accounts.length === 0}
        title="No accounts found"
        description="Try another name or email, or check back after registrations."
      >
        {/* The column floors add up to more than a phone's width, so on phones
            the table scrolls sideways inside its own region. */}
        <Table
          data={rows}
          idKey="id"
          columns={[
            {
              key: 'name',
              header: t('Name'),
              width: proportional(1, { minWidth: 160 }),
              renderCell: (account) => (
                <Text type="inherit" weight="semibold">
                  {account.name}
                </Text>
              ),
            },
            {
              key: 'email',
              header: t('Email'),
              width: proportional(1, { minWidth: 200 }),
              renderCell: (account) => (
                <Text type="inherit" color="secondary">
                  {account.email}
                </Text>
              ),
            },
            {
              key: 'role',
              header: t('Role'),
              width: proportional(1, { minWidth: 300 }),
              renderCell: (account) => {
                const role = account.role ?? 'attendee';
                return (
                  <SegmentedControl
                    label={`${t('Role')}: ${account.name}`}
                    size="sm"
                    value={role}
                    isDisabled={role === 'admin'}
                    disabledMessage={
                      role === 'admin' ? t('Admin roles cannot be changed here.') : undefined
                    }
                    onChange={(next) => {
                      // Admin can't be picked, so any change toggles organizer
                      // access. The segment moves only after the dialog confirms.
                      if (next !== role) setTarget(account.id);
                    }}
                  >
                    <SegmentedControlItem value="attendee" label={t('Regular attendee')} />
                    <SegmentedControlItem value="organizer" label={t('Organizer')} />
                    <SegmentedControlItem value="admin" label={t('Admin')} isDisabled />
                  </SegmentedControl>
                );
              },
            },
          ]}
        />
      </DataBoundary>
      <Text type="supporting">
        {t('Admin roles are managed manually and cannot be changed here.')}
      </Text>
      <ConfirmDialog
        isOpen={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Change organizer permission?"
        description="Organizer access applies to every event. Removing it does not remove attendee registrations."
        label="Confirm permission change"
        onConfirm={() => {
          const account = data.users.find((item) => item.id === target);
          if (account)
            run({ type: 'role', userId: account.id, organizer: account.role !== 'organizer' });
        }}
      />
    </VStack>
  );
}

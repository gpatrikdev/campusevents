import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { List, ListItem } from '@astryxdesign/core/List';
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
        <List edge="flush" density="spacious" hasDividers>
          {accounts.map((account) => (
            <ListItem
              key={account.id}
              label={
                <HStack gap={5} wrap="wrap" hAlign="between" vAlign="center">
                  <VStack gap={2}>
                    <Text weight="semibold">{account.name}</Text>
                    <Text color="secondary">{account.email}</Text>
                    <Text type="supporting">
                      {t(
                        account.role === 'admin'
                          ? 'Admin'
                          : account.role === 'organizer'
                            ? 'Organizer'
                            : 'Regular attendee',
                      )}
                    </Text>
                  </VStack>
                  {account.role !== 'admin' && (
                    <Button
                      label={t(
                        account.role === 'organizer'
                          ? 'Remove organizer access'
                          : 'Grant organizer access',
                      )}
                      onClick={() => setTarget(account.id)}
                    />
                  )}
                </HStack>
              }
            />
          ))}
        </List>
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

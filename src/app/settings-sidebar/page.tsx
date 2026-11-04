// Copyright (c) Meta Platforms, Inc. and affiliates.

import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Selector } from '@astryxdesign/core/Selector';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../api/context';
import { belowNavHeight, EmptyNotice } from '../../components/Feedback';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, setLanguage } = useApp();
  const narrow = useMediaQuery('(max-width: 48rem)');
  const [section, setSection] = useState('account');
  if (!user)
    return (
      <EmptyNotice
        minHeight={belowNavHeight}
        headingLevel={1}
        title={t('Sign in to continue.')}
        actions={<Button label={t('Sign in')} href="/sign-in" />}
      />
    );
  if (!user.profileComplete)
    return (
      <EmptyNotice
        minHeight={belowNavHeight}
        headingLevel={1}
        title={t('Complete your profile')}
        description={t('Confirm your profile name first.')}
        actions={<Button label={t('Complete your profile')} href="/complete-profile" />}
      />
    );
  const sections = [
    { value: 'account', label: t('Account information'), icon: 'info' },
    { value: 'language', label: t('Language'), icon: 'wrench' },
  ] as const;
  return (
    <Layout
      height="auto"
      padding={narrow ? 4 : 6}
      header={
        <LayoutHeader hasDivider>
          <Heading level={1}>{t('Profile')}</Heading>
        </LayoutHeader>
      }
      start={
        !narrow && (
          <LayoutPanel
            width="15rem"
            padding={4}
            hasDivider
            isScrollable={false}
            role="complementary"
            label={t('Profile')}
          >
            <List density="spacious" edge="outset">
              {sections.map(({ value, label, icon }) => (
                <ListItem
                  key={value}
                  label={label}
                  startContent={<Icon icon={icon} />}
                  isSelected={section === value}
                  onClick={() => setSection(value)}
                />
              ))}
            </List>
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent isScrollable={false}>
          <VStack gap={6}>
            {narrow && (
              <TabList
                role="tablist"
                value={section}
                onChange={setSection}
                hasDivider
                aria-label={t('Profile')}
              >
                {sections.map(({ value, label }) => (
                  <Tab key={value} value={value} label={label} panelId={`${value}-panel`} />
                ))}
              </TabList>
            )}
            {section === 'account' ? (
              <VStack
                as="section"
                id="account-panel"
                role={narrow ? 'tabpanel' : undefined}
                aria-label={t('Account information')}
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
                {user.role && (
                  <Text color="secondary">
                    {t('Existing registrations remain available after an organizer promotion.')}
                  </Text>
                )}
              </VStack>
            ) : (
              <VStack
                as="section"
                id="language-panel"
                role={narrow ? 'tabpanel' : undefined}
                aria-label={t('Language')}
                gap={6}
                maxWidth={640}
              >
                <Heading level={2}>{t('Language')}</Heading>
                <Selector
                  label={t('Interface language')}
                  value={i18n.language}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'hu', label: 'Magyar' },
                  ]}
                  onChange={(value) => {
                    if (value === 'en' || value === 'hu') void setLanguage(value);
                  }}
                  description={t('This preference also applies to emails and certificates.')}
                />
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

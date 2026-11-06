import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { List } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { EventListItem } from '../components/EventListItem';
import { belowNavHeight, DataBoundary, EmptyNotice } from '../components/Feedback';
import { hasEnded, instant } from '../domain/rules';

export function RegistrationsPage() {
  const { t } = useTranslation();
  const { data, user, now } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  const description = t('Open an event to manage your registration and follow-up actions.');
  if (!user)
    return (
      <EmptyNotice
        minHeight={belowNavHeight}
        headingLevel={1}
        title={t('Sign in to continue.')}
        description={description}
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
              {description}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable={false}>
          <Section variant="transparent" padding={compact ? 4 : 6}>
            <DataBoundary
              empty={registrations.length === 0}
              emptyContent={
                <EmptyNotice
                  headingLevel={2}
                  title={t('No registrations yet')}
                  description={t('Find an event and join to get a QR ticket.')}
                  actions={<Button href="/" label={t('Browse events')} />}
                  isBoxed
                />
              }
            >
              <VStack gap={8}>
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
                        <EventListItem key={registration.id} event={event} compact={compact} />
                      ))}
                    </List>
                  ))}
              </VStack>
            </DataBoundary>
          </Section>
        </LayoutContent>
      }
    />
  );
}

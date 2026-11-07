import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { List } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { ReviewIcon } from '../components/EventIcons';
import { EventListItem } from '../components/EventListItem';
import { AccountNotice, DataBoundary, EmptyNotice } from '../components/Feedback';
import { instant } from '../domain/rules';

export function ReviewsPage() {
  const { t } = useTranslation();
  const { data, user } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  const description = t(
    'Your submitted reviews. Organizers and admins see them without your name.',
  );
  if (!user?.profileComplete)
    return <AccountNotice returnTo="/reviews" description={description} />;
  const reviews = data.registrations
    .filter((item) => item.userId === user.id && item.active)
    .flatMap(({ eventId, review }) => {
      const event = data.events.find((item) => item.id === eventId && item.status === 'published');
      if (!event || !review) return [];
      // The list shows the first rating question's answer, when the form has one.
      const question = event.form?.elements.find((item) => item.type === 'rating');
      const value = question && review[question.name];
      const rating =
        question && typeof value === 'number' ? { title: question.title, value } : null;
      return [{ event, rating }];
    })
    .sort((a, b) => instant(b.event.start) - instant(a.event.start));
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={3} paddingBlockStart={compact ? 4 : 0} paddingBlockEnd={4}>
            <Heading level={1} type={compact ? 'display-3' : 'display-2'}>
              {t('Reviews')}
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
              empty={reviews.length === 0}
              emptyContent={
                <EmptyNotice
                  headingLevel={2}
                  title={t('No reviews yet')}
                  description={t('Checked-in attendees can review after the event ends.')}
                  actions={<Button href="/registrations" label={t('View registrations')} />}
                  isBoxed
                />
              }
            >
              <List
                density="spacious"
                edge="outset"
                hasDividers
                header={<Heading level={2}>{t('Submitted reviews')}</Heading>}
              >
                {reviews.map(({ event, rating }) => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    compact={compact}
                    href={`/reviews/${event.id}`}
                    endContent={
                      rating && (
                        <HStack gap={1} vAlign="center">
                          <Icon icon={ReviewIcon} size="sm" color="secondary" />
                          <Text color="secondary">
                            <VisuallyHidden>{rating.title}: </VisuallyHidden>
                            {rating.value}/5
                          </Text>
                        </HStack>
                      )
                    }
                  />
                ))}
              </List>
            </DataBoundary>
          </Section>
        </LayoutContent>
      }
    />
  );
}

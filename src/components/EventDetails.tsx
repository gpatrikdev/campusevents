import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { InfoTip } from '@astryxdesign/core/InfoTip';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../domain/format';
import type { CampusEvent } from '../domain/types';
import { LocationIcon } from './EventIcons';

/* The schedule and location, shown the same way on the staff overview and the
 * public event page. The headings always look like level 3. On the public page
 * no "Event details" heading sits above them, so screen readers get them at
 * level 2 there. */
export function EventDetails({
  event,
  headingLevel = 3,
}: {
  event: CampusEvent;
  headingLevel?: 2 | 3;
}) {
  const { t, i18n } = useTranslation();
  const compact = useMediaQuery('(max-width: 42rem)');
  return (
    <Grid columns={{ minWidth: 280, max: 2 }} gap={8}>
      <VStack as="section" gap={4}>
        <HStack gap={2} vAlign="center">
          <Icon icon="calendar" color="secondary" />
          <Heading level={3} accessibilityLevel={headingLevel}>
            {t('Date and time')}
          </Heading>
          <InfoTip
            label={t('About event times')}
            content={t('Times are shown in the event’s timezone.')}
          />
        </HStack>
        <MetadataList label={{ position: compact ? 'top' : 'start', width: '7rem' }}>
          <MetadataListItem label={t('Starts at')}>
            {formatDate(event.start, event.timezone, i18n.language)}
          </MetadataListItem>
          <MetadataListItem label={t('Ends at')}>
            {formatDate(event.end, event.timezone, i18n.language)}
          </MetadataListItem>
          <MetadataListItem label={t('Timezone')}>{event.timezone}</MetadataListItem>
        </MetadataList>
      </VStack>
      <VStack as="section" gap={4}>
        <HStack gap={2} vAlign="center">
          <Icon icon={LocationIcon} color="secondary" />
          <Heading level={3} accessibilityLevel={headingLevel}>
            {t('Location')}
          </Heading>
        </HStack>
        <Text>{event.location}</Text>
      </VStack>
    </Grid>
  );
}

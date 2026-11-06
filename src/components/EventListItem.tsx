import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateRange } from '../domain/format';
import type { CampusEvent } from '../domain/types';

// Marks an event that has started and not yet ended, in the success green.
export function HappeningNow() {
  const { t } = useTranslation();
  return (
    <HStack className="live-now">
      <Text type="supporting" weight="semibold" color="inherit">
        {t('Happening now')}
      </Text>
    </HStack>
  );
}

export function EventListItem({
  event,
  compact,
  dateDetail,
  details,
  endContent,
  className,
}: {
  event: CampusEvent;
  compact: boolean;
  dateDetail?: ReactNode;
  details?: ReactNode;
  endContent?: ReactNode;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const link = useRef<HTMLAnchorElement>(null);
  return (
    <ListItem
      interactiveRef={link}
      className={className}
      align="start"
      startContent={
        !compact && (
          <VStack gap={1} width="7.5rem">
            <Text weight="semibold">
              {formatDate(event.start, event.timezone, i18n.language, false)}
            </Text>
            {dateDetail}
          </VStack>
        )
      }
      label={
        <Link ref={link} href={`/events/${event.id}`} size="lg" color="primary" weight="semibold">
          {event.title}
        </Link>
      }
      description={
        <VStack gap={1} paddingBlockStart={1}>
          <Text color="secondary">
            {formatDateRange(event.start, event.end, event.timezone, i18n.language, compact)}
          </Text>
          <Text color="secondary">{event.location}</Text>
          <Text type="supporting">{event.timezone}</Text>
          {details}
        </VStack>
      }
      endContent={
        <HStack gap={3} vAlign="center">
          {endContent}
          <Icon icon="chevronRight" color="secondary" size="sm" />
        </HStack>
      }
    />
  );
}

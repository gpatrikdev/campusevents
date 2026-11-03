import { Badge } from '@astryxdesign/core/Badge';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from '../domain/format';
import { instant, registrationCutoff } from '../domain/rules';
import type { CampusEvent } from '../domain/types';
import { useMock } from '../mocks/hooks';

export function EventRow({ event, staff = false }: { event: CampusEvent; staff?: boolean }) {
  const { t, i18n } = useTranslation();
  const { now } = useMock();
  const ongoing = now >= instant(event.start) && now < instant(event.end);
  return (
    <VStack gap={2} paddingBlock={5} as="article">
      <HStack gap={3} wrap="wrap" vAlign="center">
        <Link
          href={staff ? `/staff/events/${event.id}` : `/events/${event.id}`}
          size="lg"
          weight="semibold"
          color="primary"
        >
          {event.title}
        </Link>
        {event.status === 'draft' ? (
          <Badge label={t('Draft')} />
        ) : ongoing ? (
          <Badge label={t('Ongoing')} variant="info" />
        ) : null}
      </HStack>
      <Text>
        {formatDate(event.start, event.timezone, i18n.language)} –{' '}
        {formatTime(event.end, event.timezone, i18n.language)} · {event.timezone}
      </Text>
      <Text color="secondary">{event.location}</Text>
      {event.status === 'published' && (
        <Text type="supporting">
          {t(now >= registrationCutoff(event) ? 'Registration closed' : 'Registration open')}
        </Text>
      )}
    </VStack>
  );
}

import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../api/context';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import type { EventStatistics, RatingSummary } from '../domain/eventStatistics';
import { formatDate, formatTime } from '../domain/format';
import { HOUR, hasEnded, instant, isStaff } from '../domain/rules';

// Astryx data colours, so the charts follow the theme and dark mode.
const BAR = 'var(--color-data-categorical-blue)';
const GRID = 'var(--color-border)';
const TOOLTIP = {
  contentStyle: {
    background: 'var(--color-background-popover)',
    border: 'var(--border-width) solid var(--color-border)',
    borderRadius: 'var(--radius-element)',
    boxShadow: 'var(--shadow-med)',
    color: 'var(--color-text-primary)',
  },
  itemStyle: { color: 'var(--color-text-primary)' },
  cursor: { fill: 'var(--color-background-muted)' },
};

export function StatisticsPage({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user, now } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return <UnavailableEvent />;
  const stats = data.statistics?.[eventId];
  const language = i18n.language;
  const percent = new Intl.NumberFormat(language, { style: 'percent' });
  const share = (count: number, total: number) => percent.format(total ? count / total : 0);
  const padding = compact ? 4 : 6;
  return (
    <VStack gap={6} width="100%">
      <VStack gap={3}>
        <Heading level={2} id="staff-task-heading">
          {t('Statistics')}
        </Heading>
        <Text color="secondary">
          {t('Attendance, reviews and certificates for this event. Names are not shown.')}
        </Text>
      </VStack>
      <DataBoundary
        empty={!stats?.registered}
        title="Nobody has registered yet"
        description={
          event.status === 'draft'
            ? 'Drafts have no registrations. Statistics appear once people join the published event.'
            : 'Statistics appear once people join the event.'
        }
      >
        {stats && (
          <VStack gap={4} width="100%">
            <Grid columns={compact ? 2 : 3} gap={4}>
              <Figure label={t('Registrations')} value={stats.registered} />
              <Figure label={t('Checked in')} value={stats.checkedIn} />
              {/* Until the end, people without a check-in can still arrive. */}
              <Figure
                label={t(hasEnded(event, now) ? 'No-shows' : 'Not checked in')}
                value={stats.noShows}
              />
              <Figure label={t('Cancellations')} value={stats.cancelled} />
              {event.form && <Figure label={t('Reviews')} value={stats.reviewed} />}
              <Figure label={t('Certificates')} value={stats.certificates}>
                {stats.failedCertificates > 0 && (
                  <Badge
                    variant="error"
                    label={t('Failed to send: {{count}}', { count: stats.failedCertificates })}
                  />
                )}
              </Figure>
            </Grid>
            <Card padding={padding}>
              <ProgressBar
                label={t('Attendance')}
                value={stats.checkedIn}
                max={stats.registered}
                hasValueLabel
                formatValueLabel={(value, max) =>
                  t('{{count}} of {{total}} ({{share}})', {
                    count: value,
                    total: max,
                    share: share(value, max),
                  })
                }
              />
            </Card>
            <Funnel
              stats={stats}
              hasReviews={!!event.form}
              share={share}
              padding={padding}
              compact={compact}
            />
            <Arrivals
              stats={stats}
              start={event.start}
              end={event.end}
              timezone={event.timezone}
              opened={now >= instant(event.start) - HOUR}
              padding={padding}
            />
            {stats.reviewed > 0 && stats.ratings.length > 0 && (
              <VStack gap={4}>
                <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                  <Heading level={3}>{t('Rating questions')}</Heading>
                  <Button
                    label={t('View all review results')}
                    href={`/staff/events/${event.id}/reviews`}
                    size="sm"
                  />
                </HStack>
                <Grid columns={compact ? 1 : 2} gap={4}>
                  {stats.ratings.map((rating) => (
                    <Rating key={rating.name} rating={rating} padding={padding} />
                  ))}
                </Grid>
              </VStack>
            )}
          </VStack>
        )}
      </DataBoundary>
    </VStack>
  );
}

function Figure({
  label,
  value,
  children,
}: {
  label: string;
  value: number;
  children?: ReactNode;
}) {
  return (
    <Card variant="muted">
      <VStack gap={1}>
        <Text color="secondary">{label}</Text>
        <Text size="2xl" weight="semibold">
          {value}
        </Text>
        {children && <HStack>{children}</HStack>}
      </VStack>
    </Card>
  );
}

/** A chart card. Screen readers get the summary and every number through the label. */
function ChartCard({
  title,
  summary,
  description,
  padding,
  children,
}: {
  title: string;
  summary: ReactNode;
  description: string;
  padding: 4 | 6;
  children?: ReactNode;
}) {
  return (
    <Card padding={padding}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>{title}</Heading>
          <Text color="secondary">{summary}</Text>
        </VStack>
        {children && (
          <VStack role="img" aria-label={description} className="chart">
            {children}
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

function Funnel({
  stats,
  hasReviews,
  share,
  padding,
  compact,
}: {
  stats: EventStatistics;
  hasReviews: boolean;
  share: (count: number, total: number) => string;
  padding: 4 | 6;
  compact: boolean;
}) {
  const { t } = useTranslation();
  // Reviews and certificates are both open only to checked-in attendees, so
  // they are measured against check-ins rather than the step above them.
  const steps = [
    { label: t('Registered'), count: stats.registered, total: 0 },
    { label: t('Checked in'), count: stats.checkedIn, total: stats.registered },
    ...(hasReviews
      ? [{ label: t('Reviewed'), count: stats.reviewed, total: stats.checkedIn }]
      : []),
    { label: t('Certificate requested'), count: stats.certificates, total: stats.checkedIn },
  ].map((step) => ({
    ...step,
    text: step.total ? `${step.count} · ${share(step.count, step.total)}` : String(step.count),
  }));
  const description = steps.map((step) => `${step.label}: ${step.text}`).join(', ');
  return (
    <ChartCard
      title={t('From registration to certificate')}
      summary={t('Check-in shares are of registrations; later steps are of check-ins.')}
      description={description}
      padding={padding}
    >
      <ResponsiveContainer width="100%" height={steps.length * 56}>
        <BarChart
          data={steps}
          layout="vertical"
          margin={{ right: compact ? 64 : 96 }}
          accessibilityLayer={false}
        >
          <XAxis type="number" hide domain={[0, Math.max(stats.registered, 1)]} />
          <YAxis
            type="category"
            dataKey="label"
            width={compact ? 104 : 160}
            tickLine={false}
            axisLine={false}
          />
          <Bar
            dataKey="count"
            fill={BAR}
            radius={4}
            barSize={28}
            // Keeps a sliver for an empty step, so its "0" label still shows.
            minPointSize={2}
            isAnimationActive={false}
          >
            <LabelList dataKey="text" position="right" className="chart-value" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function Arrivals({
  stats,
  start,
  end,
  timezone,
  opened,
  padding,
}: {
  stats: EventStatistics;
  start: string;
  end: string;
  timezone: string;
  opened: boolean;
  padding: 4 | 6;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const sameDay =
    formatDate(stats.arrivals[0]?.start ?? start, timezone, language, false) ===
    formatDate(end, timezone, language, false);
  const label = (value: string | number) =>
    sameDay
      ? formatTime(new Date(value).toISOString(), timezone, language)
      : formatDate(value, timezone, language);
  const step = stats.interval * 60_000;
  const columns = stats.arrivals.map((column) => ({
    label: label(column.start),
    until: label(instant(column.start) + step),
    count: column.count,
  }));
  const startColumn = columns[Math.floor(HOUR / step)]?.label;
  const busiest = columns.reduce((top, column) => (column.count > top.count ? column : top), {
    label: '',
    until: '',
    count: 0,
  });
  const title = t('Check-in arrivals');
  if (!opened)
    return (
      <ChartCard
        title={title}
        summary={t('Check-in opens at {{time}} ({{timezone}}).', {
          time: formatDate(instant(start) - HOUR, timezone, language),
          timezone,
        })}
        description=""
        padding={padding}
      />
    );
  const summary =
    stats.checkedIn === 0
      ? t('No check-ins yet.')
      : t('Busiest: {{count}} check-ins from {{from}} to {{to}} ({{timezone}}).', {
          count: busiest.count,
          from: busiest.label,
          to: busiest.until,
          timezone,
        });
  const description = columns
    .filter((column) => column.count > 0)
    .map((column) => `${column.label}–${column.until}: ${column.count}`)
    .join(', ');
  return (
    <ChartCard
      title={title}
      summary={summary}
      description={`${title}. ${summary} ${description}`}
      padding={padding}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={columns} margin={{ top: 16, right: 8 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
          <Tooltip
            {...TOOLTIP}
            labelFormatter={(value, payload) => `${value}–${payload[0]?.payload.until ?? ''}`}
            formatter={(value) => [value, t('Check-ins')]}
          />
          {startColumn && (
            <ReferenceLine
              x={startColumn}
              position="start"
              stroke="var(--color-text-secondary)"
              strokeDasharray="4 4"
              label={{ value: t('Start'), position: 'top', className: 'chart-value' }}
            />
          )}
          <Bar dataKey="count" fill={BAR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function Rating({ rating, padding }: { rating: RatingSummary; padding: 4 | 6 }) {
  const { t, i18n } = useTranslation();
  const average = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating.average);
  const scores = rating.scores.map((count, index) => ({ label: String(index + 1), count }));
  const summary = t('Average {{average}} out of 5 from {{count}} answers.', {
    average,
    count: rating.count,
  });
  return (
    <ChartCard
      title={rating.title}
      summary={summary}
      description={`${summary} ${scores
        .map((score) => `${t('{{score}} out of 5', { score: score.label })}: ${score.count}`)
        .join(', ')}`}
      padding={padding}
    >
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={scores} margin={{ top: 20, right: 8 }} accessibilityLayer={false}>
          <XAxis dataKey="label" tickLine={false} />
          <YAxis hide allowDecimals={false} />
          <Bar dataKey="count" fill={BAR} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="count" position="top" className="chart-value" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function formatDate(
  value: string | number,
  timezone: string,
  language: string,
  time = true,
) {
  return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-GB', {
    timeZone: timezone,
    dateStyle: 'medium',
    ...(time ? { timeStyle: 'short' as const } : {}),
  }).format(new Date(value));
}

export function formatTime(value: string, timezone: string, language: string) {
  return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-GB', {
    timeZone: timezone,
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDateRange(
  start: string | number,
  end: string | number,
  timezone: string,
  language: string,
  showDate = true,
) {
  const sameDay =
    formatDate(start, timezone, language, false) === formatDate(end, timezone, language, false);
  return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-GB', {
    timeZone: timezone,
    ...((showDate || !sameDay) && { dateStyle: 'medium' }),
    timeStyle: 'short',
  }).formatRange(new Date(start), new Date(end));
}

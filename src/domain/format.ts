// The locale for dates and times: day-month order and a 24-hour clock in
// English, as in the rest of the app, rather than the US style a bare "en" gives.
export const intlLocale = (language: string) => (language === 'hu' ? 'hu-HU' : 'en-GB');

export function formatDate(
  value: string | number,
  timezone: string,
  language: string,
  time = true,
) {
  return new Intl.DateTimeFormat(intlLocale(language), {
    timeZone: timezone,
    dateStyle: 'medium',
    ...(time ? { timeStyle: 'short' as const } : {}),
  }).format(new Date(value));
}

export function formatTime(value: string, timezone: string, language: string) {
  return new Intl.DateTimeFormat(intlLocale(language), {
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
  return new Intl.DateTimeFormat(intlLocale(language), {
    timeZone: timezone,
    ...((showDate || !sameDay) && { dateStyle: 'medium' }),
    timeStyle: 'short',
  }).formatRange(new Date(start), new Date(end));
}

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

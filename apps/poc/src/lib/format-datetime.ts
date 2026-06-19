/** Fixed locale and timezone so server and client render identical strings. */
const DISPLAY_LOCALE = "en-GB";
const DISPLAY_TIME_ZONE = "UTC";

export function formatDateTime(iso: string): string {
  const formatted = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(iso));
  return `${formatted} UTC`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(iso));
}

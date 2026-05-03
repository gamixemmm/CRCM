export const BUSINESS_TIME_ZONE = "Africa/Casablanca";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const zonedFormatter = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getZonedParts(date: Date): DateParts {
  const parts = zonedFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month") - 1,
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function getBusinessDateParts(date = new Date()) {
  const parts = getZonedParts(date);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
) {
  const desiredWallTime = Date.UTC(year, month, day, hour, minute, second, millisecond);
  let utcDate = new Date(desiredWallTime);

  for (let index = 0; index < 3; index += 1) {
    const actual = getZonedParts(utcDate);
    const actualWallTime = Date.UTC(actual.year, actual.month, actual.day, actual.hour, actual.minute, actual.second, millisecond);
    utcDate = new Date(utcDate.getTime() - (actualWallTime - desiredWallTime));
  }

  return utcDate;
}

export function getBusinessStartOfToday(date = new Date()) {
  const parts = getBusinessDateParts(date);
  return zonedDateTimeToUtc(parts.year, parts.month, parts.day);
}

export function getBusinessStartOfTomorrow(date = new Date()) {
  const parts = getBusinessDateParts(date);
  return zonedDateTimeToUtc(parts.year, parts.month, parts.day + 1);
}

export function getBusinessWeekStart(date = new Date()) {
  const today = getBusinessStartOfToday(date);
  const parts = getBusinessDateParts(today);
  const dayOfWeek = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
  }).format(today);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayOfWeek);
  const daysSinceMonday = dayIndex === 0 ? 6 : dayIndex - 1;
  return zonedDateTimeToUtc(parts.year, parts.month, parts.day - daysSinceMonday);
}

export function getBusinessMonthRange(year: number, month: number) {
  return {
    start: zonedDateTimeToUtc(year, month, 1),
    end: zonedDateTimeToUtc(year, month + 1, 1),
  };
}

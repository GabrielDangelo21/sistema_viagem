export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function isStrictCalendarDate(year: number, month: number, day: number): boolean {
  // Check month 1-12
  if (month < 1 || month > 12) return false;

  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

export function isValidIsoDate(date: string): boolean {
  if (!ISO_DATE_REGEX.test(date)) return false;

  const parts = date.split('-').map(Number);
  if (parts.length !== 3) return false;

  const [y, m, d] = parts;
  if (y === undefined || m === undefined || d === undefined) return false;

  return isStrictCalendarDate(y, m, d);
}

export function isValidIsoDateTime(dateTime: string): boolean {
  if (!ISO_DATETIME_REGEX.test(dateTime)) return false;

  const [datePart] = dateTime.split('T');
  if (!datePart) return false;

  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3) return false;

  const [y, m, d] = parts;
  if (y === undefined || m === undefined || d === undefined) return false;

  return isStrictCalendarDate(y, m, d);
}

export type TripStatus = 'planned' | 'ongoing' | 'completed';

/**
 * Derives the trip status based on the current date (UTC).
 * 
 * Rules:
 * - startDate > today => planned
 * - today BETWEEN startDate AND endDate => ongoing
 * - endDate < today => completed
 * 
 * "today" is strictly the current UTC date string (YYYY-MM-DD).
 */
export function deriveTripStatus(startDate: string, endDate: string): TripStatus {
  const today = new Date().toISOString().split('T')[0] as string;

  if (startDate > today) {
    return 'planned';
  } else if (endDate < today) {
    return 'completed';
  } else {
    return 'ongoing';
  }
}

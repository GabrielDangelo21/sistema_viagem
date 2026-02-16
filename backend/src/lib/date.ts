export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export function isValidIsoDate(date: string): boolean {
  return ISO_DATE_REGEX.test(date) && !isNaN(new Date(date).getTime());
}

export function isValidIsoDateTime(dateTime: string): boolean {
  return ISO_DATETIME_REGEX.test(dateTime) && !isNaN(new Date(dateTime).getTime());
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

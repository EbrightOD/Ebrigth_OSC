import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
} from 'date-fns';
import { isOpeningClosingSlot } from '@/lib/manpowerUtils';

export type WeekRange = {
  startDate: string;
  endDate: string;
};

export type WeekRanges = {
  lastWeek: WeekRange;
  thisWeek: WeekRange;
  nextWeek: WeekRange;
};

function toRange(date: Date): WeekRange {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

export function getWeekRanges(today: Date): WeekRanges {
  return {
    lastWeek: toRange(addWeeks(today, -1)),
    thisWeek: toRange(today),
    nextWeek: toRange(addWeeks(today, 1)),
  };
}

export type SelectionsMap = Record<string, string>;

const COACH_COLUMN_IDS = ['coach1', 'coach2', 'coach3', 'coach4', 'coach5'] as const;

function isFilled(value: string | undefined): boolean {
  if (!value) return false;
  if (value === 'None') return false;
  return true;
}

export function countClassesForSlot(
  selections: SelectionsMap,
  day: string,
  slot: string,
  branch: string,
): number {
  if (isOpeningClosingSlot(slot, branch)) return 0;
  let count = 0;
  for (const col of COACH_COLUMN_IDS) {
    if (isFilled(selections[`${day}-${slot}-${col}`])) count++;
  }
  return count;
}

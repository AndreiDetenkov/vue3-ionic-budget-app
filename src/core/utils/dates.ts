import dayjs, { type ManipulateType, type OpUnitType } from 'dayjs';
import en from 'dayjs/locale/en';
import localeData from 'dayjs/plugin/localeData';
import type { DateRange } from '@/core/storage';

dayjs.extend(localeData);
dayjs.locale(en);

interface RangeDates {
  startDate: string;
  endDate: string;
}

export const getRangeDates = (unit: OpUnitType): RangeDates => {
  const startDate = dayjs().startOf(unit).format();
  const endDate = dayjs().endOf(unit).format();

  return { startDate, endDate };
};

export const getDateRange = (unit: OpUnitType & ManipulateType, offset = 0): DateRange => {
  const target = offset === 0 ? dayjs() : dayjs().subtract(offset, unit);

  return {
    from: target.startOf(unit).format(),
    to: target.endOf(unit).format(),
  };
};

export const formatDate = (date?: string, template = 'DD.MM.YYYY'): string => {
  return dayjs(date).format(template);
};

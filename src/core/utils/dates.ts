import dayjs, { type OpUnitType } from 'dayjs';
import en from 'dayjs/locale/en';
import localeData from 'dayjs/plugin/localeData';

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

export const formatDateByTemplate = (template: string): string => {
  return dayjs().format(template);
};

export const formatDate = (date: string, template = 'DD.MM.YYYY'): string => {
  return dayjs(date).format(template);
};

export const previousYearRange = () => {
  const startDate = dayjs().subtract(1, 'year').startOf('year').format();
  const endDate = dayjs().subtract(1, 'year').endOf('year').format();

  return { startDate, endDate };
};

export const currentYearRange = () => {
  const startDate = dayjs().startOf('year').format();
  const endDate = dayjs().endOf('year').format();

  return { startDate, endDate };
};

export const previousMonthRange = (): RangeDates => {
  const startDate = dayjs().subtract(1, 'month').startOf('month').format();
  const endDate = dayjs().subtract(1, 'month').endOf('month').format();

  return { startDate, endDate };
};

export const currentMonthRange = (): RangeDates => {
  const startDate = dayjs().startOf('month').format();
  const endDate = dayjs().endOf('month').format();

  return { startDate, endDate };
};

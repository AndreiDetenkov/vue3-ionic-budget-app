import dayjs, { OpUnitType } from 'dayjs';
import ru from 'dayjs/locale/ru';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(localeData);
dayjs.locale(ru);

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

export const getPreviousYearRange = () => {
  const startDate = dayjs().subtract(1, 'year').startOf('year').format();
  const endDate = dayjs().subtract(1, 'year').endOf('year').format();

  return { startDate, endDate };
};

export const getCurrentYearRange = () => {
  const startDate = dayjs().startOf('year').format();
  const endDate = dayjs().endOf('year').format();

  return { startDate, endDate };
};

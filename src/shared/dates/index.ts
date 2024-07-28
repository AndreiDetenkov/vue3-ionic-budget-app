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

export const formatDate = (date: string): string => {
  return dayjs(date).format('DD.MM.YYYY');
};

import dayjs from 'dayjs';

interface MonthDates {
  startDate: string;
  endDate: string;
}
export const getCurrentMonthDates = (): MonthDates => {
  const startDate = dayjs().startOf('month').format();
  const endDate = dayjs().endOf('month').format();

  return { startDate, endDate };
};

export const formatDateByTemplate = (template: string): string => {
  return dayjs().format(template);
};

export const formatDate = (date: string): string => {
  return dayjs(date).format('DD.MM.YYYY');
};

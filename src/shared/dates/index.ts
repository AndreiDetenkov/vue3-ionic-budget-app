import dayjs from 'dayjs'

interface MonthDates {
  startDate: string
  endDate: string
}
const getCurrentMonthDates = (): MonthDates => {
  const startDate = dayjs().startOf('month').format()
  const endDate = dayjs().endOf('month').format()

  return { startDate, endDate }
}

const formatDateByTemplate = (template: string): string => {
  return dayjs().format(template)
}

const formatDate = (date: string): string => {
  return dayjs(date).format('DD.MM.YYYY')
}

export default {
  getCurrentMonthDates,
  formatDateByTemplate,
  formatDate,
}

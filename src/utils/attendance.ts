import { getDay, getDate, getMonth, format } from 'date-fns';
import ja from 'date-fns/locale/ja';
import { dateStringToDate, isMatchDateFormat, timeStringToMinute } from './date';
import { AttendanceReportDocument } from './document';

// NOTE: getAttendanceReportDocument で同時に行ったら、参照エラーになったので、popup側で呼び出すように修正した
export const toAttendanceRecords = (document: AttendanceReportDocument) => {
  const displayedMonth = dateStringToDate(document.displayedMonth, 'yyyy年 M月度');
  const month = getMonth(displayedMonth) + 1;

  return document.listContent.map(
    ({
      date: dateStr,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      breakTime,
      workingTime,
      holidayText = '',
      ...rest
    }) => {
      const isHoliday = holidayText.startsWith('全休');
      const isFirstDay = isMatchDateFormat(dateStr, 'M/d (EEEEE)');
      const date = dateStringToDate(isFirstDay ? dateStr : `${month}/${dateStr}`, 'M/d (EEEEE)');
      const dayOfWeek = getDay(date);
      const dayOfMonth = getDate(date);
      const checkIn = checkInStr ? dateStringToDate(checkInStr, 'H:mm') : undefined;
      const checkOut = checkOutStr ? dateStringToDate(checkOutStr, 'H:mm') : undefined;
      const breakTimeMinute = breakTime ? timeStringToMinute(breakTime) : undefined;
      const workingTimeMinute = workingTime ? timeStringToMinute(workingTime) : undefined;
      return {
        ...rest,
        month,
        isHoliday,
        holidayText,
        isFirstDay,
        date,
        dayOfWeek,
        dayOfMonth,
        checkIn,
        checkOut,
        breakTimeMinute,
        workingTimeMinute,
      };
    },
  );
};

export type AttendanceRecord = ReturnType<typeof toAttendanceRecords>[number];

const formatHoursText = ({ start, end }: { start?: Date; end?: Date }) =>
  `${start ? format(start, 'HH:mm') : 'N/A'}-${end ? format(end, 'HH:mm') : 'N/A'}`;

const formatWorkingHoursText = ({
  checkIn,
  checkOut,
  isDayOff,
  isHoliday,
  holidayText,
}: {
  checkIn?: Date;
  checkOut?: Date;
  isDayOff: boolean;
  isHoliday: boolean;
  holidayText: string;
}) => {
  if (isDayOff && !checkIn && !checkOut) {
    return '休日';
  }
  if (isHoliday) {
    return holidayText;
  }
  if (!checkIn && !checkOut) {
    return 'N/A';
  }
  return formatHoursText({ start: checkIn, end: checkOut });
};

const toWorkingHour = ({
  date,
  checkIn,
  checkOut,
  isDayOff,
  isHoliday,
  holidayText,
}: AttendanceRecord) => ({
  date: format(date, 'MM/dd(EEEEE)', { locale: ja }),
  workingHours: formatWorkingHoursText({ checkIn, checkOut, isDayOff, isHoliday, holidayText }),
});

export const generateCsv = (records: AttendanceRecord[]) => {
  const headers = ['日付', '勤務時間'];
  const monthlyWorkingHours = records
    .map(toWorkingHour)
    .map(({ date, workingHours }) => [date, workingHours]);
  const data = [headers, ...monthlyWorkingHours]
    .map((arr) => arr.map((v) => `"${v}"`).join(','))
    .join('\n');
  return new Blob([data], { type: 'text/csv' });
};

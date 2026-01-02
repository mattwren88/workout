import { addDays, eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";

export const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

export const startOfWeekMonday = (date: Date) =>
  startOfWeek(date, { weekStartsOn: 1 });

export const endOfWeekMonday = (date: Date) =>
  endOfWeek(date, { weekStartsOn: 1 });

export const weekDays = (date: Date) =>
  eachDayOfInterval({
    start: startOfWeekMonday(date),
    end: endOfWeekMonday(date)
  });

export const addDaysSafe = (date: Date, amount: number) => addDays(date, amount);

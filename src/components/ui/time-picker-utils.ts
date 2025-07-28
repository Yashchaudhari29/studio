

import { TimePickerType } from "./time-picker-utils";
import { DateObj } from "dayzed";
import { set } from "date-fns";

export type TimePickerType = "hours" | "minutes" | "seconds";

export type Period = "AM" | "PM";

export function getArrowByType(type: TimePickerType) {
  switch (type) {
    case "hours":
      return {
        up: Key.ArrowUp,
        down: Key.ArrowDown,
        left: Key.ArrowLeft,
        right: Key.ArrowRight,
        Shift: 12,
        Crtl: 1,
      };
    case "minutes":
    case "seconds":
      return {
        up: Key.ArrowUp,
        down: Key.ArrowDown,
        left: Key.ArrowLeft,
        right: Key.ArrowRight,
        Shift: 15,
        Crtl: 1,
      };
    default:
      return {
        up: "",
        down: "",
        left: "",
        right: "",
        Shift: 0,
        Crtl: 0,
      };
  }
}

export function getDateByType(date: Date, type: TimePickerType) {
  switch (type) {
    case "hours":
      return date.getHours();
    case "minutes":
      return date.getMinutes();
    case "seconds":
      return date.getSeconds();
    default:
      return 0;
  }
}

export function setDateByType(date: Date, value: number, type: TimePickerType) {
  switch (type) {
    case "hours":
      return set(date, { hours: value });
    case "minutes":
      return set(date, { minutes: value });
    case "seconds":
      return set(date, { seconds: value });
    default:
      return date;
  }
}

export function AmPM(date: Date) {
  const hours = date.getHours();
  return hours >= 12 ? "PM" : "AM";
}

// Renamed function
export function format12Hour(hour: number): number {
  if (hour === 0) {
    return 12;
  } else if (hour > 12) {
    return hour - 12;
  } else {
    return hour;
  }
}

// Renamed function
export function format24Hour(hour: number, period: Period): number {
  if (period === "PM" && hour < 12) {
    return hour + 12;
  } else if (period === "AM" && hour === 12) {
    return 0;
  } else {
    return hour;
  }
}

export enum Key {
  Enter = "Enter",
  Space = " ",
  Escape = "Escape",
  Backspace = "Backspace",
  Delete = "Delete",
  ArrowLeft = "ArrowLeft",
  ArrowUp = "ArrowUp",
  ArrowRight = "ArrowRight",
  ArrowDown = "ArrowDown",
  Home = "Home",
  End = "End",
  PageUp = "PageUp",
  PageDown = "PageDown",
  Tab = "Tab",
}

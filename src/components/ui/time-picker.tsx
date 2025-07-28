
"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { TimePickerInput } from "./time-picker-input"; // We'll create this next
import { Period } from "./time-picker-utils"; // We'll create this next
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { set } from "date-fns"; // Import set function

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ date, setDate, disabled, className }: TimePickerProps) {
  const [period, setPeriod] = React.useState<Period>(
    date ? (date.getHours() >= 12 ? "PM" : "AM") : "AM"
  );

  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const periodRef = React.useRef<HTMLButtonElement>(null); // Ref for the period SelectTrigger

  // Use effect to update period when date changes externally
  React.useEffect(() => {
      if(date) {
         setPeriod(date.getHours() >= 12 ? "PM" : "AM");
      } else {
         // Reset period if date becomes undefined
         setPeriod("AM");
      }
  }, [date]);

  const handleHourChange = (value: number) => {
    // Initialize date if it's undefined
    const baseDate = date || new Date();
    let newHour = value;
    // Adjust for 12 AM/PM format
    if (period === "PM" && newHour < 12) {
      newHour += 12;
    } else if (period === "AM" && newHour === 12) {
      newHour = 0; // Midnight case
    }
     // Ensure hour stays within 0-23 range
    newHour = Math.max(0, Math.min(23, newHour));
    setDate(set(baseDate, { hours: newHour }));
  };

  const handleMinuteChange = (value: number) => {
      // Initialize date if it's undefined
      const baseDate = date || new Date();
      // Ensure minute stays within 0-59 range
      const newMinute = Math.max(0, Math.min(59, value));
      setDate(set(baseDate, { minutes: newMinute }));
  }

  const handlePeriodChange = (newPeriod: Period) => {
      setPeriod(newPeriod);
      // Initialize date if it's undefined
      const baseDate = date || new Date();

      const currentHour = baseDate.getHours();
      let newHour = currentHour;

      if(newPeriod === "PM" && currentHour < 12) {
         newHour = currentHour + 12;
      } else if (newPeriod === "AM" && currentHour >= 12) {
         newHour = currentHour - 12;
      }
      // Ensure hour stays within 0-23 range
      newHour = Math.max(0, Math.min(23, newHour));
      setDate(set(baseDate, { hours: newHour }));
  }


   // Get hours in 12-hour format
    const hours12 = React.useMemo(() => {
        if (!date) return undefined; // Return undefined if no date
        const hours = date.getHours();
        return hours % 12 || 12; // Convert 0 to 12 for 12 AM/PM
    }, [date]);

    // Get minutes
    const minutes = React.useMemo(() => {
        return date ? date.getMinutes() : undefined; // Return undefined if no date
    }, [date]);


  return (
    // Use flex, items-end for vertical alignment, and gap for spacing
    <div className={cn("flex items-end gap-2", className)}>
      <div className="grid gap-1 text-center">
        <Label htmlFor="hours" className="text-xs">
          Hours
        </Label>
        <TimePickerInput
          picker="hours"
          date={date}
          onValueChange={handleHourChange}
          ref={hourRef}
          period={period}
          onRightFocus={() => minuteRef.current?.focus()}
          disabled={disabled}
          value={hours12} // Display 12-hour format
        />
      </div>
       <span className="text-lg font-semibold pb-1 text-muted-foreground">:</span> {/* Colon separator */}
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes" className="text-xs">
          Minutes
        </Label>
        <TimePickerInput
          picker="minutes"
          date={date}
          onValueChange={handleMinuteChange}
          ref={minuteRef}
          onLeftFocus={() => hourRef.current?.focus()}
          onRightFocus={() => periodRef.current?.focus()}
          disabled={disabled}
          value={minutes} // Use memoized minutes
        />
      </div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="period" className="text-xs opacity-0 pointer-events-none">.</Label> {/* Hidden label for alignment */}
         <Select
            value={period}
            onValueChange={handlePeriodChange}
            disabled={disabled}
        >
            <SelectTrigger
                ref={periodRef}
                className="h-10 w-[60px] focus:bg-accent focus:text-accent-foreground" // Adjusted width
                aria-label="Select AM/PM"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
        </Select>
      </div>
    </div>
  );
}

    
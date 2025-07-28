
"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import React, { ChangeEvent } from "react";
import { TimePickerType, getArrowByType, getDateByType, setDateByType } from "./time-picker-utils"; // Adjust path as needed

interface TimePickerInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: TimePickerType;
  date: Date | undefined;
  onValueChange: (value: number) => void; // Callback with the numeric value
  period?: "AM" | "PM"; // Optional period for hour calculation
  onLeftFocus?: () => void;
  onRightFocus?: () => void;
  disabled?: boolean;
  value?: number; // Controlled value from parent
}

export const TimePickerInput = React.forwardRef<HTMLInputElement, TimePickerInputProps>(
  (
    {
      className,
      type = "number", // Default to number
      min = 0,
      max, // Max will be determined by picker type
      id,
      name,
      date,
      onValueChange,
      period,
      picker,
      onLeftFocus,
      onRightFocus,
      disabled,
      value: controlledValue, // Rename prop
      ...props
    },
    ref
  ) => {
    const [flag, setFlag] = React.useState<boolean>(false);
    const [displayValue, setDisplayValue] = React.useState<string>("");

    // Calculate max based on picker type
    const maxLimit = picker === "hours" ? 12 : 59; // 12 for hours (in 12-hr format), 59 for minutes/seconds


     // Update display value when controlled value changes or becomes undefined
    React.useEffect(() => {
      const formattedValue = typeof controlledValue === 'number'
        ? controlledValue.toString().padStart(2, '0')
        : ''; // Empty string if value is undefined
      setDisplayValue(formattedValue);
    }, [controlledValue]);


    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      setFlag(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFlag(false);
      // Format value on blur
      const numericValue = parseInt(e.target.value, 10);
      if (!isNaN(numericValue)) {
          const clampedValue = Math.min(Math.max(numericValue, Number(min)), maxLimit);
          // Call parent's update function if the value actually changed or needs formatting
          if(clampedValue !== controlledValue || clampedValue.toString() !== e.target.value) {
             onValueChange(clampedValue);
             // Let useEffect handle the display update based on controlledValue change
          } else {
             // Force re-format if needed (e.g., user typed '5' and blurred)
              setDisplayValue(clampedValue.toString().padStart(2, '0'));
          }

      } else {
           // Reset to current controlled value (or empty) if input is invalid
           setDisplayValue(typeof controlledValue === 'number' ? controlledValue.toString().padStart(2, '0') : '');
      }

      props.onBlur?.(e);
    };

     const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
       let newValue = e.target.value.replace(/[^0-9]/g, ''); // Allow only numbers
       // Prevent exceeding max length (usually 2 digits)
       if (newValue.length > 2) {
           newValue = newValue.substring(newValue.length - 2);
       }

       // Ensure value doesn't exceed max limit during input if possible
       const numericValue = parseInt(newValue, 10);
       if (!isNaN(numericValue) && numericValue > maxLimit) {
          // If typing '60' for minutes, just show '5'
          newValue = newValue.charAt(0);
       }
       // Handle hour '0' input - allow '0' but treat as 12 conceptually for 12-hour format
       if (picker === "hours" && newValue === '0') {
            // Allow typing '0', validation on blur/keydown handles conversion
       } else if (picker === "hours" && numericValue === 0 && newValue.length > 1) {
            // Prevent typing '00' or '01' etc directly if treated as 12
            // newValue = ''; // Or handle differently if needed
       }


        // Temporary update display, validation happens on blur/keydown
        setDisplayValue(newValue);

        // Allow parent component to handle onChange if needed
        props.onChange?.(e);
    };


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // No date needed here, operate on controlledValue
      const { Crtl, Shift } = getArrowByType(picker);
      const M = maxLimit;

      // Allow navigation keys, delete, backspace, etc.
      if (["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"].includes(e.key)) {
        if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) onLeftFocus?.();
        if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) onRightFocus?.();
        return; // Don't interfere with default behavior
      }

      // Prevent non-numeric input except arrows
      if (!/^[0-9]$/.test(e.key) && !["ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        return;
      }

       // Use controlledValue for calculation base, default to 0 if undefined
      let val = controlledValue ?? (picker === "hours" ? 12 : 0); // Default hour to 12 if undefined
      let step = 1;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
         e.preventDefault(); // Prevent native increment/decrement
         if (e.ctrlKey || e.metaKey) step = Crtl;
         if (e.shiftKey) step = Shift;

         val = e.key === "ArrowUp" ? val + step : val - step;

         // Handle wrapping specific to hours (1-12) vs minutes/seconds (0-59)
          if (picker === "hours") {
                const minHour = 1; // Min hour in 12-hour format is 1
                 if (val > M) val = minHour + (val - M -1); // Wrap above 12
                 if (val < minHour) val = M - (minHour - val -1); // Wrap below 1
          } else {
                const minMinuteSecond = 0;
                 if (val > M) val = minMinuteSecond + (val - M - 1); // Wrap above 59
                 if (val < minMinuteSecond) val = M - (minMinuteSecond - val - 1); // Wrap below 0
          }


         // Update state by calling parent's update function
          onValueChange(val);
          // Let useEffect handle the display update based on controlledValue change
          // setDisplayValue(val.toString().padStart(2, '0'));

         // Select the input content after programmatic change
         requestAnimationFrame(() => {
            e.currentTarget.select();
          });
      }

      props.onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        id={id || picker}
        name={name || picker}
        className={cn(
          "w-[48px] text-center font-mono text-base tabular-nums caret-transparent focus:caret-black dark:focus:caret-white", // Consistent width
          flag && "text-primary",
          className
        )}
        type="text" // Use text for better control over formatting and input
        inputMode="numeric" // Hint for mobile keyboards
        pattern="[0-9]*" // Pattern for numeric input
        maxLength={2} // Limit to 2 digits
        value={displayValue} // Display state variable
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={handleInput} // Use handleInput for controlled changes
        disabled={disabled}
        aria-label={`Enter ${picker}`}
        {...props}
      />
    );
  }
);

TimePickerInput.displayName = "TimePickerInput";

    
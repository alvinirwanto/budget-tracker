"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ISO } from "@/lib/format";
import { cn } from "@/lib/utils";

/** shadcn Popover + Calendar. Value is a yyyy-MM-dd string. */
export function DatePicker({
  value,
  onChange,
  id,
  invalid,
  placeholder = "Pick a date",
  disabled,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  id?: string;
  invalid?: boolean;
  placeholder?: string;
  /** Dates for which this returns true can't be picked. */
  disabled?: (date: Date) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid || undefined}
          className={cn(
            "h-11 w-full justify-start gap-2 rounded-xl border-input bg-transparent px-3.5 text-left text-base font-normal hover:bg-muted/50",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarBlankIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{date ? format(date, "d MMM yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          disabled={disabled}
          weekStartsOn={1}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, ISO));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { forwardRef, useState, type ComponentProps } from "react";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** shadcn Input with a show/hide button. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type">>(
  function PasswordInput(props, ref) {
    const [shown, setShown] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={shown ? "text" : "password"} className="pr-12" {...props} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1.5 size-9 -translate-y-1/2 rounded-full text-muted-foreground"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
        >
          {shown ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </Button>
      </div>
    );
  },
);

"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** When set, the user must type this text before the button works. */
  confirmText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  confirmText,
}: Props) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const setOpen = (o: boolean) => {
    if (!o) setTyped("");
    onOpenChange(o);
  };
  const locked = !!confirmText && typed.trim().toLowerCase() !== confirmText.trim().toLowerCase();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {confirmText && (
          <div className="grid gap-2">
            <label htmlFor={id} className="text-sm text-muted-foreground">
              Type <span className="font-semibold break-all text-foreground">{confirmText}</span> to continue
            </label>
            <Input
              id={id}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmText}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        )}
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={locked}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SingleFieldDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  /** Small print above the field, e.g. the password rules. */
  hint?: string;
  label: string;
  type?: "text" | "password";
  initialValue?: string;
  placeholder?: string;
  autoComplete?: string;
  submitLabel: string;
  pending: boolean;
  onSubmit: (value: string) => void;
}

/** A small dialog asking for one value (a new password, a new username…). Phone-friendly: big field and buttons. */
export const SingleFieldDialog = ({
  open,
  onClose,
  title,
  description,
  hint,
  label,
  type = "text",
  initialValue = "",
  placeholder,
  autoComplete = "off",
  submitLabel,
  pending,
  onSubmit,
}: SingleFieldDialogProps) => {
  const [value, setValue] = useState(initialValue);

  // Start fresh each time the dialog opens.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const disabled = !value.trim() || value.trim() === initialValue.trim() || pending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled) onSubmit(value.trim());
          }}
        >
          <div className="space-y-2">
            <label htmlFor="single-field" className="text-sm font-medium text-foreground">
              {label}
            </label>
            <Input
              id="single-field"
              type={type}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              autoComplete={autoComplete}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={disabled}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { KeyRound, Lock, PencilLine, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiAccount } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AccountActionsProps {
  account: ApiAccount;
  /** Your own staff account: can't be locked or deleted. */
  isSelf: boolean;
  busy: boolean;
  /** Bigger, full-width buttons for phones. */
  large?: boolean;
  onToggleLock: (account: ApiAccount) => void;
  onRename: (account: ApiAccount) => void;
  onPassword: (account: ApiAccount) => void;
  onDelete: (account: ApiAccount) => void;
}

/** The buttons for one account, shared by the desktop table row and the phone card. */
export const AccountActions = ({
  account,
  isSelf,
  busy,
  large = false,
  onToggleLock,
  onRename,
  onPassword,
  onDelete,
}: AccountActionsProps) => {
  const size = large ? "h-11 text-sm" : undefined;
  return (
    <div className={cn("gap-2", large ? "grid grid-cols-2" : "flex flex-wrap")}>
      <Button
        type="button"
        variant={account.locked ? "default" : "outline"}
        size="sm"
        className={size}
        disabled={busy || isSelf}
        title={isSelf ? "You can't lock your own account" : undefined}
        onClick={() => onToggleLock(account)}
      >
        {account.locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
        {account.locked ? "Unlock" : "Lock"}
      </Button>
      <Button type="button" variant="outline" size="sm" className={size} disabled={busy} onClick={() => onRename(account)}>
        <PencilLine className="mr-2 h-4 w-4" /> Rename
      </Button>
      <Button type="button" variant="outline" size="sm" className={size} disabled={busy} onClick={() => onPassword(account)}>
        <KeyRound className="mr-2 h-4 w-4" /> Password
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive", size)}
        disabled={busy || isSelf}
        title={isSelf ? "You can't delete your own account" : undefined}
        onClick={() => onDelete(account)}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </Button>
    </div>
  );
};

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Users } from "lucide-react";
import { AccountActions } from "@/components/AccountActions";
import { BrandNav } from "@/components/BrandNav";
import { SingleFieldDialog } from "@/components/SingleFieldDialog";
import { StaffFooter } from "@/components/StaffFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { accountApi, api, formatDateTime, formatRelative, type AccountKind, type ApiAccount } from "@/lib/api";
import { STAFF_NAV } from "@/lib/staffNav";
import { cn } from "@/lib/utils";

/** Everything that differs between the student and staff account dashboards. */
export interface AccountsDashboardConfig {
  kind: AccountKind;
  /** "student" or "staff", used in sentences ("Add a student account"). */
  noun: string;
  title: string;
  description: string;
  usernamePlaceholder: string;
  passwordPolicy: string;
  /** Extra sentence in the delete confirmation. */
  deleteNote: string;
  /** Extra sentence in the rename dialog (what happens to the person's sign-in and records). */
  renameNote: string;
  /** Staff can't lock or delete their own account (the server refuses too). */
  protectSelf: boolean;
  /** Extra panel above "Add an account", given the accounts (students: team setup and slips, #37). */
  sidePanel?: (accounts: ApiAccount[]) => ReactNode;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const USERNAME_RULES = "Letters, numbers, dots, dashes and underscores only. It can't match any other account, even a locked one.";

type AccountFilter = "all" | "active" | "locked" | "seen";

/** The summary tiles: each shows a count and, when clicked, filters the list to those accounts. */
const ACCOUNT_FILTERS: { key: AccountFilter; label: string; matches: (account: ApiAccount) => boolean }[] = [
  { key: "all", label: "Total accounts", matches: () => true },
  { key: "active", label: "Active", matches: (account) => !account.locked },
  { key: "locked", label: "Locked", matches: (account) => account.locked },
  { key: "seen", label: "Seen at least once", matches: (account) => account.lastLoginAt !== null },
];

const StatusBadge = ({ account }: { account: ApiAccount }) => (
  <div className="space-y-1">
    <Badge variant={account.locked ? "destructive" : "secondary"}>{account.locked ? "Locked" : "Active"}</Badge>
    {account.temporaryLockUntil && (
      <div className="text-xs text-muted-foreground">Temp lock until {formatDateTime(account.temporaryLockUntil)}</div>
    )}
  </div>
);

export const AccountsDashboard = ({ config }: { config: AccountsDashboardConfig }) => {
  const user = api.getCurrentUser("STAFF");
  const isMobile = useIsMobile();
  const accounts = useMemo(() => accountApi(config.kind), [config.kind]);
  const queryKey = ["accounts", config.kind];
  const queryClient = useQueryClient();

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<ApiAccount | null>(null);
  const [renameTarget, setRenameTarget] = useState<ApiAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiAccount | null>(null);
  const [filter, setFilter] = useState<AccountFilter>("all");

  useEffect(() => {
    document.title = `${config.title} · BT Enterprise Day News`;
  }, [config.title]);

  const refreshAccounts = () => queryClient.invalidateQueries({ queryKey });

  const accountsQ = useQuery({ queryKey, queryFn: accounts.list, refetchInterval: 15_000 });

  const failed = (title: string) => (error: Error) =>
    toast({ title, description: error.message, variant: "destructive" });

  const createAccount = useMutation({
    mutationFn: () => accounts.create(newUsername, newPassword),
    onSuccess: (account) => {
      toast({ title: `${capitalize(config.noun)} account created`, description: `${account.username} can now sign in.` });
      setNewUsername("");
      setNewPassword("");
      refreshAccounts();
    },
    onError: failed("Could not create account"),
  });

  const toggleLock = useMutation({
    mutationFn: (account: ApiAccount) => accounts.setLocked(account.id, !account.locked),
    onSuccess: (account) => {
      toast({
        title: account.locked ? "Account locked" : "Account unlocked",
        description: `${account.username} has been ${account.locked ? "locked" : "unlocked"}.`,
      });
      refreshAccounts();
    },
    onError: failed("Could not update account"),
  });

  const changePassword = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => accounts.changePassword(id, password),
    onSuccess: (account) => {
      toast({ title: "Password updated", description: `Password changed for ${account.username}.` });
      setPasswordTarget(null);
      refreshAccounts();
    },
    onError: failed("Could not change password"),
  });

  const rename = useMutation({
    mutationFn: ({ id, username }: { id: number; username: string }) => accounts.rename(id, username),
    onSuccess: (account) => {
      toast({ title: "Username changed", description: `${renameTarget?.username} is now ${account.username}.` });
      setRenameTarget(null);
      refreshAccounts();
    },
    onError: failed("Could not rename account"),
  });

  const deleteAccount = useMutation({
    mutationFn: (id: number) => accounts.remove(id),
    onSuccess: () => {
      toast({ title: `${capitalize(config.noun)} account deleted`, description: "The account has been permanently removed." });
      setDeleteTarget(null);
      refreshAccounts();
    },
    onError: failed("Could not delete account"),
  });

  const allAccounts = useMemo(() => accountsQ.data ?? [], [accountsQ.data]);
  const activeFilter = ACCOUNT_FILTERS.find((f) => f.key === filter) ?? ACCOUNT_FILTERS[0];
  const shownAccounts = useMemo(() => allAccounts.filter(activeFilter.matches), [allAccounts, activeFilter]);

  if (!user) return null;

  const isSelf = (account: ApiAccount) => config.protectSelf && account.username === user.username;
  const createDisabled = !newUsername.trim() || !newPassword.trim() || createAccount.isPending;
  const actionsBusy = toggleLock.isPending || deleteAccount.isPending || changePassword.isPending || rename.isPending;

  const actionsFor = (account: ApiAccount, large = false) => (
    <AccountActions
      account={account}
      isSelf={isSelf(account)}
      busy={actionsBusy}
      large={large}
      onToggleLock={(target) => toggleLock.mutate(target)}
      onRename={setRenameTarget}
      onPassword={setPasswordTarget}
      onDelete={setDeleteTarget}
    />
  );

  const nameCell = (account: ApiAccount) => (
    <>
      {/* Wrap at hyphens/dots first ("comet-" / "crafts"); only break inside a word that can't fit at all. */}
      <div className="font-semibold [overflow-wrap:anywhere]">
        {account.username}
        {isSelf(account) && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
      </div>
      <div className="text-xs text-muted-foreground">Created {formatRelative(account.createdAt)}</div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <BrandNav variant="light" links={STAFF_NAV} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Account management</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{config.title}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{config.description}</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Staff-only area
          </div>
        </div>

        {accountsQ.isError && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Couldn't load the accounts: {(accountsQ.error as Error).message}
          </div>
        )}

        {/* The totals double as filters for the list; "Total accounts" shows everyone again. */}
        <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4" role="group" aria-label="Filter accounts">
          {ACCOUNT_FILTERS.map((item) => {
            const selected = item.key === activeFilter.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected ? "border-primary/60 ring-1 ring-primary/40" : "border-border",
                )}
              >
                <p className={cn("text-sm", selected ? "font-medium text-primary" : "text-muted-foreground")}>{item.label}</p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight">{allAccounts.filter(item.matches).length}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display text-2xl font-bold tracking-tight">{capitalize(config.noun)} accounts</h2>
              {activeFilter.key === "all" ? (
                <p className="mt-1 text-sm text-muted-foreground">See each account, latest login time, and most recent IP address.</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing: <span className="font-medium text-foreground">{activeFilter.label.toLowerCase()}</span>
                  {" · "}
                  <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setFilter("all")}>
                    Show all
                  </button>
                </p>
              )}
            </div>

            {accountsQ.isLoading ? (
              <div className="flex items-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
              </div>
            ) : allAccounts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No {config.noun} accounts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add the first account using the form.</p>
              </div>
            ) : shownAccounts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No accounts match "{activeFilter.label}"</p>
                <button type="button" className="mt-1 text-sm text-primary underline-offset-4 hover:underline" onClick={() => setFilter("all")}>
                  Show all accounts
                </button>
              </div>
            ) : isMobile ? (
              // Phones: one card per account with big buttons, instead of a table to scroll sideways.
              <ul className="divide-y divide-border" aria-label={`${capitalize(config.noun)} accounts`}>
                {shownAccounts.map((account) => (
                  <li key={account.id} data-testid="account-card" className="space-y-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">{nameCell(account)}</div>
                      <StatusBadge account={account} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last login: {formatDateTime(account.lastLoginAt)}
                      {account.lastLoginIp && <span className="font-mono"> · {account.lastLoginIp}</span>}
                    </p>
                    {actionsFor(account, true)}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last login</TableHead>
                      <TableHead>IP address</TableHead>
                      <TableHead className="w-[300px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shownAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="py-3">{nameCell(account)}</TableCell>
                        <TableCell className="py-3">
                          <StatusBadge account={account} />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="min-w-[180px]">
                            <div>{formatDateTime(account.lastLoginAt)}</div>
                            {account.lastLoginAt && (
                              <div className="text-xs text-muted-foreground">{formatRelative(account.lastLoginAt)}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-mono text-xs text-muted-foreground">{account.lastLoginIp ?? "—"}</span>
                        </TableCell>
                        <TableCell className="py-3">{actionsFor(account)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            {config.sidePanel?.(allAccounts)}
            <Card className="p-5">
              <h2 className="font-display text-2xl font-bold tracking-tight">Add a {config.noun} account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                New accounts appear in the list immediately and can sign in as soon as they are created.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Password policy: {config.passwordPolicy}</p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!createDisabled) createAccount.mutate();
                }}
              >
                <div className="space-y-2">
                  <label htmlFor="new-account-username" className="text-sm font-medium text-foreground">
                    Username
                  </label>
                  <Input
                    id="new-account-username"
                    value={newUsername}
                    onChange={(event) => setNewUsername(event.target.value)}
                    placeholder={config.usernamePlaceholder}
                    autoComplete="off"
                    autoCapitalize="none"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="new-account-password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Input
                    id="new-account-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Set a password"
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createDisabled}>
                  {createAccount.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Add {config.noun} account
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
      <StaffFooter />

      <SingleFieldDialog
        open={passwordTarget !== null}
        onClose={() => setPasswordTarget(null)}
        title="Change password"
        description={
          <>
            Set a new password for <span className="font-semibold text-foreground">{passwordTarget?.username}</span>.
          </>
        }
        hint={`Password policy: ${config.passwordPolicy}`}
        label="New password"
        type="password"
        placeholder="Enter a new password"
        autoComplete="new-password"
        submitLabel="Save password"
        pending={changePassword.isPending}
        onSubmit={(password) => passwordTarget && changePassword.mutate({ id: passwordTarget.id, password })}
      />

      <SingleFieldDialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename account"
        description={
          <>
            Choose a new username for <span className="font-semibold text-foreground">{renameTarget?.username}</span>.{" "}
            {config.renameNote}
          </>
        }
        hint={USERNAME_RULES}
        label="New username"
        initialValue={renameTarget?.username ?? ""}
        submitLabel="Save username"
        pending={rename.isPending}
        onSubmit={(username) => renameTarget && rename.mutate({ id: renameTarget.id, username })}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {config.noun} account?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{deleteTarget?.username}</span> will no longer be able to
              sign in. {config.deleteNote}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" className="h-11" onClick={() => setDeleteTarget(null)} disabled={deleteAccount.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11"
              disabled={deleteAccount.isPending}
              onClick={() => deleteTarget && deleteAccount.mutate(deleteTarget.id)}
            >
              {deleteAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

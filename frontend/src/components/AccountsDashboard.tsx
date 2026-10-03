import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Lock, Trash2, Unlock, UserPlus, Users } from "lucide-react";
import { BrandNav } from "@/components/BrandNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { accountApi, api, formatDateTime, formatRelative, type AccountKind, type ApiAccount } from "@/lib/api";
import { STAFF_NAV } from "@/lib/staffNav";

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
  /** Staff can't lock or delete their own account (the server refuses too). */
  protectSelf: boolean;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const AccountsDashboard = ({ config }: { config: AccountsDashboardConfig }) => {
  const user = api.getCurrentUser("STAFF");
  const accounts = useMemo(() => accountApi(config.kind), [config.kind]);
  const queryKey = ["accounts", config.kind];
  const queryClient = useQueryClient();

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<ApiAccount | null>(null);
  const [nextPassword, setNextPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ApiAccount | null>(null);

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
    mutationFn: ({ id, locked }: { id: number; locked: boolean }) => accounts.setLocked(id, locked),
    onSuccess: (account, variables) => {
      toast({
        title: variables.locked ? "Account locked" : "Account unlocked",
        description: `${account.username} has been ${variables.locked ? "locked" : "unlocked"}.`,
      });
      refreshAccounts();
    },
    onError: failed("Could not update account"),
  });

  const changePassword = useMutation({
    mutationFn: () => {
      if (!passwordTarget) throw new Error("No account selected");
      return accounts.changePassword(passwordTarget.id, nextPassword);
    },
    onSuccess: (account) => {
      toast({ title: "Password updated", description: `Password changed for ${account.username}.` });
      setPasswordTarget(null);
      setNextPassword("");
      refreshAccounts();
    },
    onError: failed("Could not change password"),
  });

  const deleteAccount = useMutation({
    mutationFn: () => {
      if (!deleteTarget) throw new Error("No account selected");
      return accounts.remove(deleteTarget.id);
    },
    onSuccess: () => {
      toast({ title: `${capitalize(config.noun)} account deleted`, description: "The account has been permanently removed." });
      setDeleteTarget(null);
      refreshAccounts();
    },
    onError: failed("Could not delete account"),
  });

  const summary = useMemo(() => {
    const list = accountsQ.data ?? [];
    const locked = list.filter((account) => account.locked).length;
    return {
      total: list.length,
      active: list.length - locked,
      locked,
      seen: list.filter((account) => account.lastLoginAt !== null).length,
    };
  }, [accountsQ.data]);

  if (!user) return null;

  const isSelf = (account: ApiAccount) => config.protectSelf && account.username === user.username;
  const createDisabled = !newUsername.trim() || !newPassword.trim() || createAccount.isPending;
  const passwordDisabled = !nextPassword.trim() || changePassword.isPending;
  const actionsBusy = toggleLock.isPending || deleteAccount.isPending || changePassword.isPending;

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
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Staff-only area
          </div>
        </div>

        {accountsQ.isError && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Couldn't load the accounts: {(accountsQ.error as Error).message}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total accounts", value: summary.total },
            { label: "Active", value: summary.active },
            { label: "Locked", value: summary.locked },
            { label: "Seen at least once", value: summary.seen },
          ].map((item) => (
            <Card key={item.label} className="p-4">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight">{item.value}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display text-2xl font-bold tracking-tight">{capitalize(config.noun)} accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                See each account, latest login time, and most recent IP address.
              </p>
            </div>

            {accountsQ.isLoading ? (
              <div className="flex items-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
              </div>
            ) : (accountsQ.data?.length ?? 0) === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No {config.noun} accounts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add the first account using the form.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last login</TableHead>
                      <TableHead>IP address</TableHead>
                      <TableHead className="w-[280px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(accountsQ.data ?? []).map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="py-3">
                          <div className="font-semibold">
                            {account.username}
                            {isSelf(account) && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">Created {formatRelative(account.createdAt)}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="space-y-1">
                            <Badge variant={account.locked ? "destructive" : "secondary"}>
                              {account.locked ? "Locked" : "Active"}
                            </Badge>
                            {account.temporaryLockUntil && (
                              <div className="text-xs text-muted-foreground">
                                Temp lock until {formatDateTime(account.temporaryLockUntil)}
                              </div>
                            )}
                          </div>
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
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={account.locked ? "default" : "outline"}
                              size="sm"
                              disabled={actionsBusy || isSelf(account)}
                              title={isSelf(account) ? "You can't lock your own account" : undefined}
                              onClick={() => toggleLock.mutate({ id: account.id, locked: !account.locked })}
                            >
                              {account.locked ? (
                                <>
                                  <Unlock className="mr-2 h-4 w-4" /> Unlock
                                </>
                              ) : (
                                <>
                                  <Lock className="mr-2 h-4 w-4" /> Lock
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={actionsBusy}
                              onClick={() => {
                                setPasswordTarget(account);
                                setNextPassword("");
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" /> Password
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={actionsBusy || isSelf(account)}
                              title={isSelf(account) ? "You can't delete your own account" : undefined}
                              onClick={() => setDeleteTarget(account)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

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
      </main>

      <Dialog open={passwordTarget !== null} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-semibold text-foreground">{passwordTarget?.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Password policy: {config.passwordPolicy}</p>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!passwordDisabled) changePassword.mutate();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="next-password" className="text-sm font-medium text-foreground">
                New password
              </label>
              <Input
                id="next-password"
                type="password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Enter a new password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)} disabled={changePassword.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={passwordDisabled}>
                {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {config.noun} account?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{deleteTarget?.username}</span> will no longer be able to
              sign in. {config.deleteNote}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteAccount.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteAccount.isPending} onClick={() => deleteAccount.mutate()}>
              {deleteAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

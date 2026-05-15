import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Lock, Trash2, Unlock, UserPlus, Users } from "lucide-react";
import { BrandNav } from "@/components/BrandNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { api, formatDateTime, formatRelative, type ApiStudentAccount } from "@/lib/api";

const StudentAccountsDashboard = () => {
  const user = api.getCurrentUser();
  const staffName = user?.username || "staff";
  const queryClient = useQueryClient();

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<ApiStudentAccount | null>(null);
  const [nextPassword, setNextPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ApiStudentAccount | null>(null);

  useEffect(() => {
    document.title = "Student Account Dashboard · BT Enterprise Day News";
  }, []);

  const refreshAccounts = () => {
    queryClient.invalidateQueries({ queryKey: ["student-accounts"] });
  };

  const accountsQ = useQuery({
    queryKey: ["student-accounts", staffName],
    queryFn: async () => api.listStudentAccounts(staffName),
    refetchInterval: 15_000,
  });

  const createAccount = useMutation({
    mutationFn: async () => api.createStudentAccount(newUsername, newPassword, staffName),
    onSuccess: (account) => {
      toast({
        title: "Student account created",
        description: `${account.username} can now sign in to the student portal.`,
      });
      setNewUsername("");
      setNewPassword("");
      refreshAccounts();
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, locked }: { id: number; locked: boolean }) =>
      api.setStudentAccountLocked(id, locked, staffName),
    onSuccess: (account, variables) => {
      toast({
        title: variables.locked ? "Account locked" : "Account unlocked",
        description: `${account.username} has been ${variables.locked ? "locked" : "unlocked"}.`,
      });
      refreshAccounts();
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!passwordTarget) throw new Error("No account selected");
      return api.changeStudentAccountPassword(passwordTarget.id, nextPassword, staffName);
    },
    onSuccess: (account) => {
      toast({
        title: "Password updated",
        description: `Password changed for ${account.username}.`,
      });
      setPasswordTarget(null);
      setNextPassword("");
      refreshAccounts();
    },
    onError: (error: Error) => {
      toast({
        title: "Could not change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) throw new Error("No account selected");
      await api.deleteStudentAccount(deleteTarget.id, staffName);
    },
    onSuccess: () => {
      toast({
        title: "Student account deleted",
        description: "The account has been permanently removed.",
      });
      setDeleteTarget(null);
      refreshAccounts();
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const summary = useMemo(() => {
    const accounts = accountsQ.data ?? [];
    const locked = accounts.filter((account) => account.locked).length;
    const active = accounts.length - locked;
    const recentlySeen = accounts.filter((account) => account.lastLoginAt !== null).length;
    return { total: accounts.length, active, locked, recentlySeen };
  }, [accountsQ.data]);

  const createDisabled = !newUsername.trim() || !newPassword.trim() || createAccount.isPending;
  const passwordDisabled = !nextPassword.trim() || changePassword.isPending;
  const actionsBusy = toggleLock.isPending || deleteAccount.isPending || changePassword.isPending;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <BrandNav
        variant="light"
        secondaryLink={{ to: "/staff", label: "Back to advert dashboard" }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Account management
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Student Account Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Manage student sign-ins for the upload portal: passwords, lock/unlock, and recent login activity.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Staff-only area
          </div>
        </div>

        {accountsQ.isError && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Couldn't reach the backend at <code>{import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"}</code>.
            Check it's running and CORS allows this origin.
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total accounts", value: summary.total },
            { label: "Active", value: summary.active },
            { label: "Locked", value: summary.locked },
            { label: "Seen at least once", value: summary.recentlySeen },
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
              <h2 className="font-display text-2xl font-bold tracking-tight">Student accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                See each account, latest login time, and most recent IP address.
              </p>
            </div>

            {accountsQ.isLoading ? (
              <div className="flex items-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading student accounts…
              </div>
            ) : (accountsQ.data?.length ?? 0) === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No student accounts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the first account using the panel on the right.
                </p>
              </div>
            ) : (
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
                        <div>
                          <div className="font-semibold">{account.username}</div>
                          <div className="text-xs text-muted-foreground">
                            Created {formatRelative(account.createdAt)}
                          </div>
                        </div>
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
                            <div className="text-xs text-muted-foreground">
                              {formatRelative(account.lastLoginAt)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {account.lastLoginIp ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={account.locked ? "default" : "outline"}
                            size="sm"
                            disabled={actionsBusy}
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
                            disabled={actionsBusy}
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
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-2xl font-bold tracking-tight">Add a student account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New accounts appear in the list immediately and can sign in as soon as they are created.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Password policy: minimum 6 characters, including at least one uppercase letter and one number.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="student-username" className="text-sm font-medium text-foreground">
                  Username
                </label>
                <Input
                  id="student-username"
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  placeholder="e.g. year10-team1"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="student-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="student-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Set a password"
                  autoComplete="new-password"
                />
              </div>

              <Button className="w-full" disabled={createDisabled} onClick={() => createAccount.mutate()}>
                {createAccount.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Add student account
                  </>
                )}
              </Button>
            </div>
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
          <p className="text-xs text-muted-foreground">
            Password policy: minimum 6 characters, including at least one uppercase letter and one number.
          </p>

          <div className="space-y-4">
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
              <Button variant="outline" onClick={() => setPasswordTarget(null)} disabled={changePassword.isPending}>
                Cancel
              </Button>
              <Button disabled={passwordDisabled} onClick={() => changePassword.mutate()}>
                {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete student account?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{deleteTarget?.username}</span> will no longer be able to sign in.
              Existing uploads will remain in the system.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteAccount.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={() => deleteAccount.mutate()}
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

export default StudentAccountsDashboard;



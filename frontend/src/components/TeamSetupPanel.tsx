import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Printer, Users, Wifi } from "lucide-react";
import { LoginSlip, type SlipLogin } from "@/components/LoginSlip";
import { PrintableSlips, printSlips } from "@/components/PrintableSlips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { api, type ApiAccount, type EventDetails, type TeamLogin } from "@/lib/api";
import { MAX_TEAMS, appAddress, teamNamesFromList, teamNamesFromPattern } from "@/lib/loginSlips";
import { cn } from "@/lib/utils";

type NameMode = "numbered" | "list";

const EMPTY_DETAILS: EventDetails = { wifiName: null, wifiPassword: null, appAddress: null };

/**
 * Team setup for the Student Account Dashboard (issue #37): create many team accounts at once with generated
 * passwords, print their login slips (till printer or A4), reprint a lost slip, and the Wi-Fi/address details
 * printed on them. Passwords are only known straight after they're set, so slips are printed from here.
 */
export const TeamSetupPanel = ({ accounts }: { accounts: ApiAccount[] }) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<NameMode>("numbered");
  const [prefix, setPrefix] = useState("team");
  const [count, setCount] = useState("26");
  const [list, setList] = useState("");
  const [results, setResults] = useState<TeamLogin[]>([]);
  const [reprintId, setReprintId] = useState("");
  const [confirmReprint, setConfirmReprint] = useState<ApiAccount | null>(null);

  const detailsQ = useQuery({ queryKey: ["event-details"], queryFn: api.eventDetails });
  const address = appAddress(detailsQ.data, window.location.origin);

  const names = useMemo(
    () => (mode === "numbered" ? teamNamesFromPattern(prefix, Number(count) || 0) : teamNamesFromList(list)),
    [mode, prefix, count, list],
  );
  const tooMany = names.length > MAX_TEAMS;
  const slips: SlipLogin[] = results
    .filter((r) => r.password)
    .map((r) => ({ username: r.username, password: r.password as string }));
  const skipped = results.filter((r) => r.status === "SKIPPED");

  const refreshAccounts = () => queryClient.invalidateQueries({ queryKey: ["accounts", "student"] });

  const createTeams = useMutation({
    mutationFn: () => api.createTeams(names),
    onSuccess: (made) => {
      setResults(made);
      const created = made.filter((r) => r.status === "CREATED").length;
      toast({
        title: `${created} team${created === 1 ? "" : "s"} created`,
        description: created > 0 ? "Print their login slips now: the passwords are only shown here." : undefined,
      });
      refreshAccounts();
    },
    onError: (e: Error) => toast({ title: "Could not create teams", description: e.message, variant: "destructive" }),
  });

  const reprint = useMutation({
    mutationFn: (account: ApiAccount) => api.newTeamPassword(account.id),
    onSuccess: (login) => {
      setConfirmReprint(null);
      setReprintId("");
      setResults([login]);
      toast({ title: `New password for ${login.username}`, description: "Print the new slip; the old one no longer works." });
      refreshAccounts();
    },
    onError: (e: Error) => toast({ title: "Could not reset the password", description: e.message, variant: "destructive" }),
  });

  const reprintTarget = accounts.find((a) => String(a.id) === reprintId) ?? null;

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <Users className="h-5 w-5 text-primary" /> Set up teams
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create every team's account at once, with easy-to-type passwords, and print a login slip for each.
      </p>

      {/* 1. Names */}
      <div className="mt-5 inline-flex rounded-lg border border-border p-1" role="group" aria-label="How to name the teams">
        {(
          [
            ["numbered", "Numbered"],
            ["list", "List of names"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            onClick={() => setMode(key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (names.length > 0 && !tooMany) createTeams.mutate();
        }}
      >
        {mode === "numbered" ? (
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <label className="space-y-1.5 text-sm font-medium">
              <span>Name starts with</span>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} autoCapitalize="none" autoComplete="off" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>How many</span>
              <Input type="number" min={1} max={MAX_TEAMS} value={count} onChange={(e) => setCount(e.target.value)} />
            </label>
          </div>
        ) : (
          <label className="block space-y-1.5 text-sm font-medium">
            <span>One team per line</span>
            <Textarea
              rows={5}
              value={list}
              onChange={(e) => setList(e.target.value)}
              placeholder={"Rocket Lemonade\nPixel Pals\nByte Bakery"}
            />
          </label>
        )}

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {names.length === 0
            ? "No team names yet."
            : tooMany
              ? `That's ${names.length} teams; the most at once is ${MAX_TEAMS}.`
              : `Creates ${names.length} team${names.length === 1 ? "" : "s"}: ${names.slice(0, 3).join(", ")}${names.length > 3 ? `, … ${names.at(-1)}` : ""}. Existing names are skipped.`}
        </p>

        <Button type="submit" className="w-full" disabled={names.length === 0 || tooMany || createTeams.isPending}>
          {createTeams.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
          {createTeams.isPending ? "Creating teams…" : "Create teams"}
        </Button>
      </form>

      {/* 2. Results and printing */}
      {results.length > 0 && (
        <div className="mt-6 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4" aria-label="New team logins">
          <p className="text-sm font-medium">
            {slips.length > 0
              ? `${slips.length} login slip${slips.length === 1 ? "" : "s"} ready. Print them now: the passwords are only shown here.`
              : "No new logins to print."}
          </p>
          {skipped.length > 0 && (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {skipped.map((s) => (
                <li key={s.username || s.message}>
                  Skipped <span className="font-medium text-foreground">{s.username || "(blank)"}</span>: {s.message}
                </li>
              ))}
            </ul>
          )}
          {slips.length > 0 && (
            <>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-card text-sm">
                <table className="w-full">
                  <tbody>
                    {slips.map((s) => (
                      <tr key={s.username} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5 font-medium">{s.username}</td>
                        <td className="px-3 py-1.5 font-mono">{s.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => printSlips("receipt")}>
                  <Printer className="mr-2 h-4 w-4" /> Till printer
                </Button>
                <Button variant="outline" onClick={() => printSlips("a4")}>
                  <Printer className="mr-2 h-4 w-4" /> A4 paper
                </Button>
              </div>
              <div className="pt-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
                <div className="flex justify-center overflow-x-auto" data-testid="slip-preview">
                  <div className="slip-paper">
                    <LoginSlip login={slips[0]} details={detailsQ.data} address={address} />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setResults([])}>
                Done, hide the passwords
              </Button>
              <PrintableSlips logins={slips} details={detailsQ.data} address={address} />
            </>
          )}
        </div>
      )}

      {/* 3. Reprint one */}
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4 text-primary" /> Lost a slip?
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Gives the team a new password and prints a new slip. Their old password stops working.
        </p>
        <div className="mt-3 flex gap-2">
          <select
            aria-label="Team to reprint"
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            value={reprintId}
            onChange={(e) => setReprintId(e.target.value)}
          >
            <option value="">Choose a team…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.username}
              </option>
            ))}
          </select>
          <Button variant="outline" disabled={!reprintTarget} onClick={() => setConfirmReprint(reprintTarget)}>
            New slip
          </Button>
        </div>
      </div>

      {/* 4. What's printed on the slips */}
      <SlipDetailsForm details={detailsQ.data} />

      <Dialog open={confirmReprint !== null} onOpenChange={(open) => !open && setConfirmReprint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New password for {confirmReprint?.username}?</DialogTitle>
            <DialogDescription>
              Their old slip will stop working. Anyone on the team who is signed in stays signed in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" onClick={() => setConfirmReprint(null)} disabled={reprint.isPending}>
              Cancel
            </Button>
            <Button onClick={() => confirmReprint && reprint.mutate(confirmReprint)} disabled={reprint.isPending}>
              {reprint.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set new password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/** The Wi-Fi and address printed on every slip. Saved on the server so every staff laptop prints the same. */
const SlipDetailsForm = ({ details }: { details?: EventDetails }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EventDetails | null>(null);
  const current = draft ?? details ?? EMPTY_DETAILS;

  const save = useMutation({
    mutationFn: () => api.saveEventDetails(current),
    onSuccess: (saved) => {
      queryClient.setQueryData(["event-details"], saved);
      setDraft(null);
      toast({ title: "Slip details saved" });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const field = (key: keyof EventDetails, label: string, placeholder: string, hint?: string) => (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <Input
        value={current[key] ?? ""}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        onChange={(e) => setDraft({ ...current, [key]: e.target.value })}
      />
      {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );

  return (
    <form
      className="mt-6 space-y-3 border-t border-border pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <Wifi className="h-4 w-4 text-primary" /> Printed on the slips
      </h3>
      {field("wifiName", "Wi-Fi name", "e.g. EnterpriseDay")}
      {field("wifiPassword", "Wi-Fi password", "Leave empty for an open network")}
      {field(
        "appAddress",
        "App address",
        window.location.origin,
        "Where phones open the app, e.g. http://192.168.1.10. Leave empty to use this page's address.",
      )}
      <Button type="submit" variant="outline" className="w-full" disabled={draft === null || save.isPending}>
        {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save slip details
      </Button>
    </form>
  );
};

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, Printer } from "lucide-react";
import { PrintArea, usePrintJob } from "@/components/PrintArea";
import { TeamInvoice } from "@/components/TeamInvoice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { api, formatDateTime, type LedgerLine } from "@/lib/api";

const KIND_LABEL: Record<LedgerLine["kind"], string> = {
  CHARGE: "Charged",
  CREDIT: "Refunded",
  PAYMENT: "Paid",
};

/**
 * A team's balance owed on the Student Account Dashboard (issue #48), and "Mark as paid" once a member of
 * staff has taken the whole amount from the team's (virtual) bank. No partial payments.
 */
export const TeamBalanceCell = ({ team }: { team: string }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const balancesQ = useQuery({ queryKey: ["balances"], queryFn: api.balances });
  const balance = balancesQ.data?.find((b) => b.team === team);
  const accountQ = useQuery({ queryKey: ["balances", team], queryFn: () => api.teamAccount(team), enabled: open });
  const { job, print } = usePrintJob<"invoice">();

  const markPaid = useMutation({
    mutationFn: (amount: number) => api.markPaid(team, amount),
    onSuccess: () => {
      toast({ title: `${team}: paid`, description: "Their balance is now 0." });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["balances"] });
    },
    onError: (e: Error) => {
      toast({ title: "Not marked as paid", description: e.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
    },
  });

  if (!balance) return <span className="text-muted-foreground">–</span>;
  const owed = balance.owed;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`font-semibold underline-offset-4 hover:underline ${owed > 0 ? "text-destructive" : "text-muted-foreground"}`}
        title="See charges and payments"
      >
        {owed > 0 ? `Owes ${owed}` : owed < 0 ? `In credit ${-owed}` : "Nothing owed"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{team}'s account</DialogTitle>
            <DialogDescription>
              Charged {balance.charged} · refunded {balance.credited} · paid {balance.paid} ·{" "}
              <span className="font-semibold text-foreground">
                {owed > 0 ? `owes ${owed}` : owed < 0 ? `in credit ${-owed}` : "nothing owed"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-64 overflow-y-auto rounded-md border border-border text-sm">
            {accountQ.isLoading ? (
              <p className="flex items-center gap-2 p-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : accountQ.data && accountQ.data.entries.length > 0 ? (
              <table className="w-full">
                <tbody>
                  {accountQ.data.entries.map((e, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{formatDateTime(e.at)}</td>
                      <td className="px-3 py-1.5">
                        {KIND_LABEL[e.kind]}
                        {e.description && <span className="block text-xs text-muted-foreground">{e.description}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {e.kind === "CHARGE" ? "+" : "−"}
                        {e.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-3 text-muted-foreground">No charges or payments yet.</p>
            )}
          </div>

          {/* An invoice the team can take to the bank (issue #50). */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Invoice:</span>
            <Button size="sm" variant="outline" disabled={!accountQ.data} onClick={() => print("invoice", "receipt-long")}>
              <Printer className="mr-2 h-4 w-4" /> Till printer
            </Button>
            <Button size="sm" variant="outline" disabled={!accountQ.data} onClick={() => print("invoice", "a4-sheet")}>
              A4 paper
            </Button>
          </div>

          {owed > 0 && (
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm">
                Have you taken <b>{owed}</b> from <b>{team}</b>'s bank account? Only mark it paid once you have: it
                clears the whole balance (no part-payments).
              </p>
              <Button onClick={() => markPaid.mutate(owed)} disabled={markPaid.isPending}>
                {markPaid.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Landmark className="mr-2 h-4 w-4" />}
                Yes, mark {owed} as paid
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {job && accountQ.data && (
        <PrintArea>
          <TeamInvoice account={accountQ.data} />
        </PrintArea>
      )}
    </div>
  );
};

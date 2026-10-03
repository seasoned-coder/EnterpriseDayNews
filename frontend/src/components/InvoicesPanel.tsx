import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";
import { PrintArea, usePrintJob } from "@/components/PrintArea";
import { TeamInvoice } from "@/components/TeamInvoice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Print every team's invoice in one go (issue #50), so teams can settle up at the (virtual) bank. On the till
 * printer each invoice comes out on its own; on A4 they're laid out to cut apart. (One team's invoice can also
 * be printed from its balance.)
 */
export const InvoicesPanel = () => {
  const [owingOnly, setOwingOnly] = useState(true);
  const invoicesQ = useQuery({ queryKey: ["balances", "invoices", owingOnly], queryFn: () => api.invoices(owingOnly) });
  const { job, print } = usePrintJob<"invoices">();
  const count = invoicesQ.data?.length ?? 0;

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <FileText className="h-5 w-5 text-primary" /> Invoices
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Print an invoice for each team: its approved adverts, refunds, payments and what it owes, to take to the bank.
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-border p-1" role="group" aria-label="Which teams">
        {(
          [
            [true, "Teams that owe"],
            [false, "All teams"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={owingOnly === value}
            onClick={() => setOwingOnly(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              owingOnly === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {invoicesQ.isLoading
          ? "Loading…"
          : count === 0
            ? owingOnly
              ? "No team owes anything right now."
              : "No teams yet."
            : `${count} invoice${count === 1 ? "" : "s"} to print.`}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button disabled={count === 0} onClick={() => print("invoices", "receipt-long")}>
          <Printer className="mr-2 h-4 w-4" /> Till printer
        </Button>
        <Button variant="outline" disabled={count === 0} onClick={() => print("invoices", "a4-cards")}>
          A4 paper
        </Button>
      </div>

      {job && invoicesQ.data && (
        <PrintArea>
          {invoicesQ.data.map((account) => (
            <TeamInvoice key={account.balance.team} account={account} />
          ))}
        </PrintArea>
      )}
    </Card>
  );
};

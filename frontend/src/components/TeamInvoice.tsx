import type { LedgerLine, TeamAccount } from "@/lib/api";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const LABEL: Record<LedgerLine["kind"], string> = { CHARGE: "", CREDIT: "Refund", PAYMENT: "Payment" };

/**
 * A team's invoice (issue #50): every approved advert it's paying for, any refunds and payments, and what it
 * owes, so it can settle up at the (virtual) bank. Sized for 80 mm till paper; also prints on A4.
 */
export const TeamInvoice = ({ account, now = new Date() }: { account: TeamAccount; now?: Date }) => {
  const { balance, entries } = account;
  const reference = `INV-${balance.team.toUpperCase()}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;
  return (
    <article className="ticket" aria-label={`Invoice for ${balance.team}`}>
      <header className="ticket__brand">BT ENTERPRISE DAY NEWS</header>
      <div className="receipt__title">INVOICE</div>
      <div className="receipt__small">To</div>
      <div className="receipt__team">{balance.team}</div>
      <div className="receipt__row receipt__small">
        <span>{reference}</span>
        <span>{dateTime(now.toISOString())}</span>
      </div>
      <div className="receipt__rule" />

      {entries.length === 0 ? (
        <div className="receipt__small">No approved adverts yet.</div>
      ) : (
        entries.map((e, i) => (
          <div key={i} className="receipt__line">
            <div className="receipt__row">
              <span className="[overflow-wrap:anywhere]">
                {LABEL[e.kind] && <b>{LABEL[e.kind]}: </b>}
                {e.kind === "PAYMENT" ? "paid from your bank" : (e.description ?? "Advert").replace(/^(Approved|Refund, not approved after all): /, "")}
              </span>
              <span>
                {e.kind === "CHARGE" ? "" : "−"}
                {e.amount}
              </span>
            </div>
            <div className="receipt__small">{dateTime(e.at)}</div>
          </div>
        ))
      )}

      <div className="receipt__rule" />
      <div className="receipt__row">
        <span>Adverts</span>
        <span>{balance.charged}</span>
      </div>
      {balance.credited > 0 && (
        <div className="receipt__row">
          <span>Refunds</span>
          <span>−{balance.credited}</span>
        </div>
      )}
      {balance.paid > 0 && (
        <div className="receipt__row">
          <span>Already paid</span>
          <span>−{balance.paid}</span>
        </div>
      )}
      <div className="receipt__row receipt__total">
        <span>{balance.owed < 0 ? "IN CREDIT" : "TO PAY"}</span>
        <span>{Math.abs(balance.owed)}</span>
      </div>
      <div className="receipt__rule" />
      <div className="receipt__small">
        Amounts in event money. Take this invoice to the bank to pay. Adverts are charged once approved, at the price
        when you sent them; deleted adverts aren't refunded.
      </div>
      <div className="receipt__signature">Paid · bank stamp / initials: ____________</div>
    </article>
  );
};

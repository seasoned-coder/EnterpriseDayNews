import type { TeamBalance } from "@/lib/api";

const printedAt = (now: Date) =>
  now.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * The End of Day report (issue #48), printed before Clear Down wipes everything: for each company, how many
 * adverts it made, what it paid, and what it still owes. Narrow enough for till paper; also prints on A4.
 */
export const EndOfDayReport = ({ teams, now = new Date() }: { teams: TeamBalance[]; now?: Date }) => {
  const totalPaid = teams.reduce((sum, t) => sum + t.paid, 0);
  const totalOwed = teams.reduce((sum, t) => sum + Math.max(0, t.owed), 0);
  const totalAdverts = teams.reduce((sum, t) => sum + t.advertsCharged, 0);
  return (
    <article className="ticket" aria-label="End of Day report">
      <header className="ticket__brand">BT ENTERPRISE DAY NEWS</header>
      <div className="receipt__title">END OF DAY REPORT</div>
      <div className="receipt__subtitle receipt__small">{printedAt(now)}</div>
      {teams.map((t) => (
        <div key={t.team} className="receipt__line">
          <div className="receipt__row">
            <b className="[overflow-wrap:anywhere]">{t.team}</b>
            <span>{t.owed > 0 ? `OWES ${t.owed}` : t.owed < 0 ? `In credit ${-t.owed}` : "Settled"}</span>
          </div>
          <div className="receipt__small">
            Adverts: {t.advertsCharged} approved ({t.advertsUploaded} in the system) · Paid {t.paid}
            {t.credited > 0 && ` · Refunded ${t.credited}`}
          </div>
        </div>
      ))}
      <div className="receipt__rule" />
      <div className="receipt__row">
        <span>Companies</span>
        <span>{teams.length}</span>
      </div>
      <div className="receipt__row">
        <span>Approved adverts</span>
        <span>{totalAdverts}</span>
      </div>
      <div className="receipt__row">
        <span>Paid to the bank</span>
        <span>{totalPaid}</span>
      </div>
      <div className="receipt__row">
        <span>Still owed</span>
        <span>{totalOwed}</span>
      </div>
      <div className="receipt__rule" />
      <div className="receipt__small">
        Amounts in event money. Approved adverts are charged at the price when uploaded; adverts rejected after
        approval are refunded; deleted adverts are not.
      </div>
    </article>
  );
};

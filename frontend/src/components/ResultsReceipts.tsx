import type { TeamResult } from "@/lib/api";
import { formatScreenTime, formatValue } from "@/lib/results";

const ordinal = (n: number) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};

const printedAt = (now: Date) =>
  now.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The whole leaderboard on one long till receipt (issue #40), most screen time first. Two short lines per
 * team so it fits 72 mm (about 42 characters); also prints on A4.
 */
export const LeaderboardReceipt = ({ teams, now = new Date() }: { teams: TeamResult[]; now?: Date }) => (
  <article className="ticket" aria-label="Leaderboard receipt">
    <header className="ticket__brand">BT ENTERPRISE DAY NEWS</header>
    <div className="receipt__title">SCREEN TIME LEADERBOARD</div>
    <div className="receipt__subtitle receipt__small">Printed {printedAt(now)}</div>
    {teams.map((t, i) => (
      <div key={t.team} className="receipt__line">
        <div className="receipt__row">
          <span>
            <b>{i + 1}.</b> {t.team}
          </span>
          <span>{formatScreenTime(t.seconds)}</span>
        </div>
        <div className="receipt__small">
          Spent {t.spent} · shown {t.plays}× · {formatValue(t.costPerMinute)} per min
        </div>
      </div>
    ))}
    <div className="receipt__rule" />
    <div className="receipt__small">
      Screen time: how long the team's adverts were on the big screen. Per min: event money spent for each minute
      on screen (lower = better value).
    </div>
  </article>
);

/** One team's "what you got for your money" receipt (issue #40), to hand to the team. */
export const TeamReceipt = ({
  result,
  rank,
  teamCount,
  now = new Date(),
}: {
  result: TeamResult;
  rank: number;
  teamCount: number;
  now?: Date;
}) => (
  <article className="ticket" aria-label={`Receipt for ${result.team}`}>
    <header className="ticket__brand">BT ENTERPRISE DAY NEWS</header>
    <div className="receipt__title">SCREEN TIME RECEIPT</div>
    <div className="receipt__small">Team</div>
    <div className="receipt__team">{result.team}</div>
    <div className="receipt__row">
      <span>Adverts approved</span>
      <span>{result.adverts}</span>
    </div>
    <div className="receipt__row">
      <span>Spent (event money)</span>
      <span>{result.spent}</span>
    </div>
    <div className="receipt__row">
      <span>Times on the big screen</span>
      <span>{result.plays}</span>
    </div>
    <div className="receipt__row">
      <span>Total screen time</span>
      <span>{formatScreenTime(result.seconds)}</span>
    </div>
    <div className="receipt__row">
      <span>Cost per minute on screen</span>
      <span>{formatValue(result.costPerMinute)}</span>
    </div>
    <div className="receipt__rule" />
    <div className="receipt__row">
      <span>Screen time ranking</span>
      <span>
        {ordinal(rank)} of {teamCount}
      </span>
    </div>
    <div className="receipt__rule" />
    <div className="receipt__subtitle receipt__small">
      Thank you for advertising! · {printedAt(now)}
    </div>
  </article>
);

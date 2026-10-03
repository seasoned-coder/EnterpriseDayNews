package org.example.enterprisedaynews.dto;

/**
 * One team's line on the leaderboard (issue #40).
 *
 * @param spent           event money spent on their approved adverts
 * @param seconds         total time their adverts were on the projector
 * @param costPerMinute   spent per minute on screen (lower is better value); null until they've been shown
 */
public record TeamResult(String team, long adverts, long spent, long plays, long seconds, Double costPerMinute) {

    public static TeamResult of(String team, long adverts, long spent, long plays, long seconds) {
        Double perMinute = seconds > 0 ? Math.round(spent / (seconds / 60.0) * 10) / 10.0 : null;
        return new TeamResult(team, adverts, spent, plays, seconds, perMinute);
    }
}

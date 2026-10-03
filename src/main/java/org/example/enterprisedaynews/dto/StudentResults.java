package org.example.enterprisedaynews.dto;

import java.util.List;

/** What a team got for its money (issue #40): its totals, and each advert's screen time. */
public record StudentResults(TeamResult team, List<AdvertResult> adverts) {

    /** How often, and for how long, one of the team's adverts was shown. */
    public record AdvertResult(Long imageId, long plays, long seconds) {
    }
}

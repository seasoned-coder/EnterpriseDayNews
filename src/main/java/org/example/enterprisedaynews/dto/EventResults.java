package org.example.enterprisedaynews.dto;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

import static org.example.enterprisedaynews.dto.ApiTimes.withServerOffset;

/**
 * Every team's results, most screen time first (issue #40).
 *
 * @param lastPlayAt when the projector last recorded a showing; null if it never has (e.g. not opened with
 *                   its key), so staff can tell whether plays are being recorded
 */
public record EventResults(List<TeamResult> teams, OffsetDateTime lastPlayAt) {

    public static EventResults of(List<TeamResult> teams, LocalDateTime lastPlayAt) {
        return new EventResults(teams, withServerOffset(lastPlayAt));
    }
}

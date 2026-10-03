package org.example.enterprisedaynews.dto;

import java.time.OffsetDateTime;

/** From the projector: it showed this advert for this many seconds, ending at {@code playedAt} (issue #40). */
public record PlayReport(Long imageId, int seconds, OffsetDateTime playedAt) {
}

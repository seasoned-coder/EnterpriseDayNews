package org.example.enterprisedaynews.dto;

import org.example.enterprisedaynews.model.PriceWobble;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

import static org.example.enterprisedaynews.dto.ApiTimes.withServerOffset;

/**
 * A price wobble as the API shows it (issue #41).
 *
 * @param activeNow false if it's scheduled to start later (staff see it; students only see it once it starts)
 */
public record PriceWobbleView(int percent, String message, OffsetDateTime startsAt, OffsetDateTime endsAt,
                              boolean activeNow) {

    public static PriceWobbleView of(PriceWobble wobble, LocalDateTime now) {
        return new PriceWobbleView(wobble.getPercent(), wobble.getMessage(), withServerOffset(wobble.getStartsAt()),
                withServerOffset(wobble.getEndsAt()), wobble.isActiveAt(now));
    }
}

package org.example.enterprisedaynews.dto;

import java.time.OffsetDateTime;

/**
 * Staff setting a price wobble (issue #41).
 *
 * @param percent  prices as a percentage of normal, e.g. 50 (half price) or 200 (double)
 * @param startsAt null: straight away
 * @param endsAt   null: until staff end it
 */
public record PriceWobbleRequest(int percent, String message, OffsetDateTime startsAt, OffsetDateTime endsAt) {
}
